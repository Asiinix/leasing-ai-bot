/**
 * Shared lease application draft: one state for the calculator, the assistant and the
 * application form. Pure functions only — safe to import on the client and the server.
 */
import type { ClientType } from "./types";

export const DRAFT_FIELDS = [
  "subject",
  "clientType",
  "modelId",
  "price",
  "advancePercent",
  "months",
  "contactName",
  "contactPhone",
] as const;
export type DraftField = (typeof DRAFT_FIELDS)[number];

/** Where the current value came from. "default" values are examples, never confirmed data. */
export type FieldSource = "default" | "form" | "chat";

export interface LeaseDraft {
  /** The only supported product is passenger car leasing. */
  subject: "car" | null;
  clientType: ClientType;
  modelId: number;
  /** Asset price in KZT; 0 means "not specified". */
  price: number;
  advancePercent: number;
  months: number;
  contactName: string;
  /** Normalized to +7XXXXXXXXXX. */
  contactPhone: string;
}

export interface DraftState {
  values: LeaseDraft;
  sources: Record<DraftField, FieldSource>;
  /** Per-field revision: a late assistant patch applies only if the field was not changed since. */
  revs: Record<DraftField, number>;
}

export type DraftPatch = Partial<LeaseDraft>;

export const PRICE_MIN = 1;
export const PRICE_MAX = 999_999_999;
export const MONTHS_MIN = 1;
export const MONTHS_MAX = 120;

export const FIELD_LABELS: Record<DraftField, string> = {
  subject: "Предмет лизинга",
  clientType: "Тип клиента",
  modelId: "Автомобиль",
  price: "Стоимость",
  advancePercent: "Аванс",
  months: "Срок",
  contactName: "Контактное лицо",
  contactPhone: "Телефон",
};

const fieldRecord = <T>(value: T) =>
  Object.fromEntries(DRAFT_FIELDS.map((field) => [field, value])) as Record<DraftField, T>;

/** The calculator example (Tucson, 15 млн, 20%, 48 мес.) is a sample, not client data. */
export function initialDraft(): DraftState {
  return {
    values: {
      subject: null,
      clientType: "IP",
      modelId: 2875,
      price: 15_000_000,
      advancePercent: 20,
      months: 48,
      contactName: "",
      contactPhone: "",
    },
    sources: fieldRecord<FieldSource>("default"),
    revs: fieldRecord(0),
  };
}

/**
 * Same rule as the application contact form: digits, spaces, brackets and dashes, 10–15
 * digits. A Kazakhstan "8 7xx…" number becomes +7…. Returns "+<digits>" or null.
 */
export function normalizePhone(input: string): string | null {
  const raw = input.trim();
  if (!/^\+?[\d\s()-]+$/.test(raw)) return null;
  let digits = raw.replace(/\D/g, "");
  if (digits.length < 10 || digits.length > 15) return null;
  if (digits.length === 11 && digits[0] === "8") digits = `7${digits.slice(1)}`;
  if (digits.length === 10) digits = `7${digits}`;
  return `+${digits}`;
}

export const isValidEmail = (value: string) =>
  /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim()) && value.trim().length <= 254;
export const isValidIin = (value: string) => /^\d{12}$/.test(value);

export function formatPhone(phone: string): string {
  const d = phone.replace(/\D/g, "").slice(-10);
  return d.length === 10
    ? `+7 ${d.slice(0, 3)} ${d.slice(3, 6)} ${d.slice(6, 8)} ${d.slice(8)}`
    : phone;
}

/** Hide personal data from the model and logs: only the fact that it is present. */
export function maskPhone(phone: string): string {
  return phone ? `+7 ••• ••• ${phone.slice(-4, -2)} ${phone.slice(-2)}` : "";
}

export type ValidationResult<T> = { ok: true; value: T } | { ok: false; error: string };

/** Validate one field value from an untrusted source (browser, model tool call). */
export function validateField<K extends DraftField>(
  field: K,
  value: unknown,
): ValidationResult<LeaseDraft[K]> {
  const ok = (v: unknown) => ({ ok: true as const, value: v as LeaseDraft[K] });
  const fail = (error: string) => ({ ok: false as const, error });
  switch (field) {
    case "subject":
      return value === "car" || value === null
        ? ok(value)
        : fail("Поддерживается только легковой автомобиль.");
    case "clientType":
      return value === "IP" || value === "TOO" ? ok(value) : fail("Тип клиента: ИП или ТОО.");
    case "modelId":
      return Number.isSafeInteger(value) && (value as number) > 0
        ? ok(value)
        : fail("Некорректный идентификатор модели.");
    case "price":
      return Number.isSafeInteger(value) &&
        (value as number) >= PRICE_MIN &&
        (value as number) <= PRICE_MAX
        ? ok(value)
        : fail("Стоимость — целое число тенге от 1 до 999 999 999.");
    case "advancePercent":
      return typeof value === "number" && Number.isFinite(value) && value > 0 && value < 100
        ? ok(Math.round(value * 100) / 100)
        : fail("Аванс — процент больше 0 и меньше 100.");
    case "months":
      return Number.isInteger(value) &&
        (value as number) >= MONTHS_MIN &&
        (value as number) <= MONTHS_MAX
        ? ok(value)
        : fail("Срок — целое число месяцев от 1 до 120.");
    case "contactName": {
      const name = typeof value === "string" ? value.trim().replace(/\s+/g, " ") : "";
      // Same rule as the application form: surname and name, patronymic optional.
      return name.split(" ").length >= 2 && name.length <= 200 && /^[\p{L}\s.'-]+$/u.test(name)
        ? ok(name)
        : fail("Укажите фамилию и имя, отчество — при наличии.");
    }
    case "contactPhone": {
      const phone = typeof value === "string" ? normalizePhone(value) : null;
      return phone ? ok(phone) : fail("Укажите от 10 до 15 цифр, например +7 (700) 123-45-67.");
    }
  }
  return fail("Неизвестное поле.");
}

/** Validate a whole draft state received from the browser. Returns null if it is malformed. */
export function parseDraftState(input: unknown): DraftState | null {
  if (!input || typeof input !== "object") return null;
  const raw = input as Partial<DraftState>;
  if (!raw.values || !raw.sources || !raw.revs) return null;
  const base = initialDraft();
  for (const field of DRAFT_FIELDS) {
    const value = (raw.values as unknown as Record<string, unknown>)[field];
    const source = (raw.sources as Record<string, unknown>)[field];
    const rev = (raw.revs as Record<string, unknown>)[field];
    if (source !== "default" && source !== "form" && source !== "chat") return null;
    if (!Number.isSafeInteger(rev) || (rev as number) < 0) return null;
    const emptyAllowed =
      (field === "price" && value === 0) ||
      ((field === "contactName" || field === "contactPhone") && value === "");
    if (!emptyAllowed) {
      const checked = validateField(field, value);
      if (!checked.ok) return null;
      (base.values as unknown as Record<string, unknown>)[field] = checked.value;
    } else {
      (base.values as unknown as Record<string, unknown>)[field] = value;
    }
    base.sources[field] = source;
    base.revs[field] = rev as number;
  }
  return base;
}

/**
 * Apply an assistant patch computed against `baseRevs`. A field the user changed after the
 * request was sent keeps the user's value (stale-response protection).
 */
export function applyPatch(
  state: DraftState,
  patch: DraftPatch,
  baseRevs: Record<DraftField, number>,
  source: FieldSource = "chat",
  /** Поля с ориентировочными значениями: остаются неподтвержденными (как пример). */
  estimated: DraftField[] = [],
): { state: DraftState; applied: DraftField[]; skipped: DraftField[] } {
  const next: DraftState = {
    values: { ...state.values },
    sources: { ...state.sources },
    revs: { ...state.revs },
  };
  const applied: DraftField[] = [];
  const skipped: DraftField[] = [];
  for (const field of DRAFT_FIELDS) {
    if (!(field in patch)) continue;
    if (state.revs[field] !== baseRevs[field]) {
      skipped.push(field);
      continue;
    }
    (next.values as unknown as Record<string, unknown>)[field] = patch[field];
    next.sources[field] = estimated.includes(field) ? "default" : source;
    next.revs[field] = state.revs[field] + 1;
    applied.push(field);
  }
  return { state: next, applied, skipped };
}

/** Local edits (calculator, form) bump the revision so older assistant patches cannot win. */
export function setFields(state: DraftState, patch: DraftPatch, source: FieldSource = "form") {
  const next: DraftState = {
    values: { ...state.values, ...patch },
    sources: { ...state.sources },
    revs: { ...state.revs },
  };
  for (const field of Object.keys(patch) as DraftField[]) {
    next.sources[field] = source;
    next.revs[field] = state.revs[field] + 1;
  }
  return next;
}

/** Fields the client still has to provide or confirm before submitting. */
export function missingFields(state: DraftState): DraftField[] {
  const { values, sources } = state;
  const missing: DraftField[] = [];
  for (const field of ["clientType", "modelId", "advancePercent", "months"] as const)
    if (sources[field] === "default") missing.push(field);
  if (!values.price || sources.price === "default") missing.push("price");
  if (!values.contactName) missing.push("contactName");
  if (!values.contactPhone) missing.push("contactPhone");
  return missing;
}

/** Stable key of the application content: the same content is never stored twice. */
export function applicationFingerprint(values: LeaseDraft): string {
  return [
    values.clientType,
    values.modelId,
    values.price,
    values.advancePercent,
    values.months,
    values.contactName.toLowerCase(),
    values.contactPhone,
  ].join("|");
}
