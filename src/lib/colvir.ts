import snapshotJson from "../data/colvir-snapshot.json";
import type {
  CatalogData,
  ClientType,
  LeaseModel,
  LeaseRate,
  PriceLimit,
  TermsData,
} from "./types";

const BASE = "https://business.bcc.kz/v1/dbp/bcc-online-leasing/api/v1/colvir/";
const ENDPOINTS = {
  models: "z_077_pkg_auto_leasing.p_get_model",
  brands: "z_077_pkg_auto_leasing.p_get_brand",
  partners: "z_077_pkg_auto_leasing.p_get_partners",
  years: "autoLeasing.CarReleaseYears",
  rates: "MSBgetAutolizingRateAdvance",
  limits: "MSB_GetMaxMinSummAutolizing",
} as const;
const CATALOG_TTL = 10 * 60_000;
const TERMS_TTL = 60_000;
const FALLBACK_TTL = 15_000;
const FETCH_TIMEOUT = 6_500;
const MAX_CACHE_ENTRIES = 128;

type JsonObject = Record<string, unknown>;
type CatalogResponses = { models: unknown; brands: unknown; partners: unknown; years: unknown };
type CapturedResponse = { checkedAt: string; response: unknown };
type Snapshot = {
  catalog: { checkedAt: string; responses: CatalogResponses };
  limits: Record<ClientType, CapturedResponse>;
  rates: Record<ClientType, Record<string, CapturedResponse>>;
};
const snapshot = snapshotJson as Snapshot;

export class ColvirInputError extends Error {
  constructor(
    message: string,
    public readonly status: 400 | 404 = 400,
  ) {
    super(message);
    this.name = "ColvirInputError";
  }
}

function object(value: unknown): JsonObject | undefined {
  return value !== null && typeof value === "object" && !Array.isArray(value)
    ? (value as JsonObject)
    : undefined;
}

function finiteNumber(value: unknown): number | undefined {
  if (typeof value !== "number" && typeof value !== "string") return undefined;
  if (typeof value === "string" && !value.trim()) return undefined;
  const result = Number(value);
  return Number.isFinite(result) ? result : undefined;
}

function positiveInteger(value: unknown): number | undefined {
  const number = finiteNumber(value);
  return number !== undefined && Number.isSafeInteger(number) && number > 0 ? number : undefined;
}

function text(value: unknown): string | undefined {
  if (typeof value !== "string") return undefined;
  const result = value.trim();
  return result && result.length <= 250 ? result : undefined;
}

/** HTTP JSON envelopes: lists use body.data.p_dmnlst; limits/years use body.data. */
function list(body: unknown, nested = true): JsonObject[] {
  const data = object(body)?.data;
  const rows = nested ? object(data)?.p_dmnlst : data;
  if (!Array.isArray(rows)) throw new Error("Unexpected reference data format");
  return rows.map(object).filter((row): row is JsonObject => row !== undefined);
}

/** Conflicting records with the same ID are not safe to resolve automatically. */
function uniqueById<T extends { id: number }>(rows: T[]): T[] {
  const result = new Map<number, T>();
  const conflicts = new Set<number>();
  for (const row of rows) {
    if (conflicts.has(row.id)) continue;
    const previous = result.get(row.id);
    if (previous && JSON.stringify(previous) !== JSON.stringify(row)) {
      conflicts.add(row.id);
      result.delete(row.id);
    } else {
      result.set(row.id, row);
    }
  }
  return [...result.values()];
}

export function normalizeCatalog(
  responses: CatalogResponses,
): Pick<CatalogData, "models" | "years"> {
  const partners = new Map(
    uniqueById(
      list(responses.partners).flatMap((row) => {
        const id = positiveInteger(row.ID);
        const name = text(row.NAME);
        return id && name ? [{ id, name }] : [];
      }),
    ).map((partner) => [partner.id, partner]),
  );

  const brands = new Map(
    uniqueById(
      list(responses.brands).flatMap((row) => {
        const id = positiveInteger(row.ID);
        const partnerId = positiveInteger(row.ID_PARTNER);
        const name = text(row.NAME);
        return id && partnerId && name && partners.has(partnerId) ? [{ id, partnerId, name }] : [];
      }),
    ).map((brand) => [brand.id, brand]),
  );

  const models = uniqueById<LeaseModel>(
    list(responses.models).flatMap((row) => {
      // A null CAR_TYPE has broader semantics in the original app; this MVP accepts explicit passenger cars only.
      if (finiteNumber(row.CAR_TYPE) !== 1) return [];
      const id = positiveInteger(row.ID);
      const brandId = positiveInteger(row.ID_BRAND);
      const name = text(row.NAME);
      const brand = brandId ? brands.get(brandId) : undefined;
      if (!id || !name || !brand) return [];
      const explicitPartner = positiveInteger(row.ID_PARTNER);
      if (row.ID_PARTNER != null && explicitPartner !== brand.partnerId) return [];
      const partner = partners.get(brand.partnerId);
      return partner
        ? [{ id, name, brand: brand.name, partnerId: partner.id, partnerName: partner.name }]
        : [];
    }),
  ).sort((a, b) =>
    `${a.brand} ${a.name} ${a.partnerName}`.localeCompare(
      `${b.brand} ${b.name} ${b.partnerName}`,
      "ru",
    ),
  );

  const years = [
    ...new Set(
      list(responses.years, false).flatMap((row) => {
        const year = positiveInteger(row.quantity);
        return year && year >= 1900 && year <= 2100 ? [year] : [];
      }),
    ),
  ].sort((a, b) => b - a);

  return { models, years };
}

export function normalizeRates(body: unknown, modelId: number): LeaseRate[] {
  const groups = new Map<string, LeaseRate[]>();
  for (const row of list(body)) {
    if (row.SUBS != null && row.SUBS !== "") continue;
    const id = positiveInteger(row.ID_MODEL);
    const months = positiveInteger(row.MONTHS);
    const advancePercent = finiteNumber(row.ADVANCE);
    const annualRate = finiteNumber(row.RATE);
    const rateId = positiveInteger(row.ID_RATES_MODEL);
    if (
      id !== modelId ||
      !months ||
      months <= 36 ||
      !rateId ||
      advancePercent === undefined ||
      advancePercent < 0 ||
      advancePercent >= 100 ||
      advancePercent === 40 ||
      advancePercent === 50 ||
      annualRate === undefined ||
      annualRate < 0
    )
      continue;
    const rate: LeaseRate = { modelId, months, advancePercent, annualRate, rateId };
    const key = `${months}:${advancePercent}`;
    groups.set(key, [...(groups.get(key) ?? []), rate]);
  }

  // Keep identical duplicates only. Different IDs or rates are ambiguous even when monthly terms match.
  return [...groups.values()]
    .flatMap((group) =>
      group.every((row) => JSON.stringify(row) === JSON.stringify(group[0])) ? [group[0]] : [],
    )
    .sort((a, b) => a.months - b.months || a.advancePercent - b.advancePercent);
}

export function normalizeLimits(body: unknown): PriceLimit[] {
  const groups = new Map<number, PriceLimit[]>();
  for (const row of list(body, false)) {
    const rawName = text(row.name);
    if (!rawName || !/^\d+(?:\.\d+)?\s*%?$/.test(rawName)) continue;
    const advancePercent = finiteNumber(rawName.replace("%", "").trim());
    const minPrice = finiteNumber(row.min_sum);
    const maxPrice = finiteNumber(row.max_sum);
    if (
      advancePercent === undefined ||
      advancePercent < 0 ||
      advancePercent >= 100 ||
      minPrice === undefined ||
      maxPrice === undefined ||
      minPrice <= 0 ||
      maxPrice < minPrice
    )
      continue;
    const limit = { advancePercent, minPrice, maxPrice };
    groups.set(advancePercent, [...(groups.get(advancePercent) ?? []), limit]);
  }
  return [...groups.values()]
    .flatMap((group) =>
      group.every((row) => JSON.stringify(row) === JSON.stringify(group[0])) ? [group[0]] : [],
    )
    .sort((a, b) => a.advancePercent - b.advancePercent);
}

async function fetchReference(key: keyof typeof ENDPOINTS, payload?: JsonObject): Promise<unknown> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), FETCH_TIMEOUT);
  try {
    const response = await fetch(`${BASE}${ENDPOINTS[key]}`, {
      method: payload ? "POST" : "GET",
      headers: payload
        ? { Accept: "application/json", "Content-Type": "application/json" }
        : { Accept: "application/json" },
      body: payload ? JSON.stringify(payload) : undefined,
      credentials: "omit",
      cache: "no-store",
      redirect: "error",
      signal: controller.signal,
    });
    if (!response.ok) throw new Error("Reference service unavailable");
    return await response.json();
  } finally {
    clearTimeout(timeout);
  }
}

const cache = new Map<string, { value: CatalogData | TermsData; expiresAt: number }>();
const inFlight = new Map<string, Promise<CatalogData | TermsData>>();

async function cached<T extends CatalogData | TermsData>(
  key: string,
  ttl: number,
  loader: () => Promise<T>,
): Promise<T> {
  const existing = cache.get(key);
  if (existing && existing.expiresAt > Date.now()) return existing.value as T;
  const pending = inFlight.get(key);
  if (pending) return pending as Promise<T>;
  const operation = loader()
    .then((value) => {
      if (cache.size >= MAX_CACHE_ENTRIES && !cache.has(key))
        cache.delete(cache.keys().next().value!);
      cache.set(key, {
        value,
        expiresAt: Date.now() + (value.source === "snapshot" ? FALLBACK_TTL : ttl),
      });
      return value;
    })
    .finally(() => {
      inFlight.delete(key);
    });
  inFlight.set(key, operation);
  return operation;
}

function snapshotCatalog(): CatalogData {
  return {
    ...normalizeCatalog(snapshot.catalog.responses),
    source: "snapshot",
    checkedAt: snapshot.catalog.checkedAt,
  };
}

function snapshotTerms(modelId: number, clientType: ClientType): TermsData {
  const capturedRates = snapshot.rates[clientType][String(modelId)];
  const capturedLimits = snapshot.limits[clientType];
  const limits = normalizeLimits(capturedLimits.response);
  const rates = capturedRates ? normalizeRates(capturedRates.response, modelId) : [];
  // A missing offline model has no known tariff. Do not synthesize one from other models.
  const checkedAt = [
    capturedRates?.checkedAt ?? snapshot.catalog.checkedAt,
    capturedLimits.checkedAt,
  ].sort((a, b) => Date.parse(a) - Date.parse(b))[0];
  return {
    rates: rates.filter((rate) =>
      limits.some((limit) => limit.advancePercent === rate.advancePercent),
    ),
    limits,
    source: "snapshot",
    checkedAt,
  };
}

export async function getCatalog(): Promise<CatalogData> {
  if (process.env.COLVIR_MODE === "snapshot") return snapshotCatalog();
  return cached("catalog", CATALOG_TTL, async () => {
    try {
      const [models, brands, partners, years] = await Promise.all([
        fetchReference("models"),
        fetchReference("brands"),
        fetchReference("partners"),
        fetchReference("years"),
      ]);
      return {
        ...normalizeCatalog({ models, brands, partners, years }),
        source: "live",
        checkedAt: new Date().toISOString(),
      };
    } catch {
      return snapshotCatalog();
    }
  });
}

export async function getTerms(modelId: number, clientType: ClientType): Promise<TermsData> {
  if (
    !Number.isSafeInteger(modelId) ||
    modelId <= 0 ||
    (clientType !== "IP" && clientType !== "TOO")
  ) {
    throw new ColvirInputError("Некорректные параметры расчета");
  }
  const catalog = await getCatalog();
  if (!catalog.models.some((model) => model.id === modelId))
    throw new ColvirInputError("Модель не найдена", 404);
  if (process.env.COLVIR_MODE === "snapshot") return snapshotTerms(modelId, clientType);
  return cached(`terms:${clientType}:${modelId}`, TERMS_TTL, async () => {
    try {
      const [rateBody, limitBody] = await Promise.all([
        fetchReference("rates", { p_id_models: [modelId], p_cli_type: clientType }),
        fetchReference("limits", { cli_type: clientType }),
      ]);
      const limits = normalizeLimits(limitBody);
      const rates = normalizeRates(rateBody, modelId).filter((rate) =>
        limits.some((limit) => limit.advancePercent === rate.advancePercent),
      );
      return { rates, limits, source: "live", checkedAt: new Date().toISOString() };
    } catch {
      return snapshotTerms(modelId, clientType);
    }
  });
}
