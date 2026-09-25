/**
 * Server-side assistant tools. The model (or the deterministic fallback) can only change
 * the draft through these functions; every argument is validated here, and all financial
 * numbers come from finance.ts over BCC tariff rows.
 */
import type { AssistantCard, QuoteView } from "./assistant-contract";
import {
  FIELD_LABELS,
  maskPhone,
  missingFields,
  validateField,
  type DraftField,
  type DraftPatch,
  type DraftState,
} from "./draft";
import { calculateQuote, estimateMaxPrice, findOffers, isPriceAllowed } from "./finance";
import { percent } from "./format";
import type { CatalogData, ClientType, TermsData } from "./types";
import { findVehiclesInText, modelLabel, searchModels } from "./vehicle";

export interface ToolDeps {
  getCatalog(): Promise<CatalogData>;
  getTerms(modelId: number, clientType: ClientType): Promise<TermsData>;
}

/** Mutable per-request context: a working copy of the draft plus what changed. */
export class ToolSession {
  state: DraftState;
  patch: DraftPatch = {};
  cards: AssistantCard[] = [];

  constructor(
    initial: DraftState,
    private readonly deps: ToolDeps,
  ) {
    this.state = {
      values: { ...initial.values },
      sources: { ...initial.sources },
      revs: { ...initial.revs },
    };
  }

  private set<K extends DraftField>(field: K, value: DraftState["values"][K]) {
    this.state.values[field] = value;
    this.state.sources[field] = "chat";
    (this.patch as Record<string, unknown>)[field] = value;
  }

  private card(card: AssistantCard) {
    // Keep one card per type: the latest result wins.
    this.cards = [...this.cards.filter((c) => c.type !== card.type), card];
  }

  private async termsFor(values = this.state.values): Promise<TermsData | null> {
    try {
      return await this.deps.getTerms(values.modelId, values.clientType);
    } catch {
      return null;
    }
  }

  private async label(modelId = this.state.values.modelId) {
    try {
      const catalog = await this.deps.getCatalog();
      const model = catalog.models.find((m) => m.id === modelId);
      return model ? `${modelLabel(model)} (${model.partnerName})` : `модель ${modelId}`;
    } catch {
      return `модель ${modelId}`;
    }
  }

  async getDraft() {
    const { values, sources } = this.state;
    return {
      subject: values.subject === "car" ? "легковой автомобиль" : null,
      clientType: { value: values.clientType, confirmed: sources.clientType !== "default" },
      vehicle: {
        modelId: values.modelId,
        label: await this.label(),
        confirmed: sources.modelId !== "default",
      },
      priceKzt: {
        value: values.price || null,
        confirmed: !!values.price && sources.price !== "default",
      },
      advancePercent: {
        value: values.advancePercent,
        confirmed: sources.advancePercent !== "default",
      },
      months: { value: values.months, confirmed: sources.months !== "default" },
      // Personal data never goes to the model in clear text.
      contactName: values.contactName ? "указано" : null,
      contactPhone: values.contactPhone ? maskPhone(values.contactPhone) : null,
      note: "confirmed=false означает пример из калькулятора, а не данные клиента.",
      missing: missingFields(this.state).map((f) => FIELD_LABELS[f]),
    };
  }

  async updateDraft(args: {
    subject?: "car" | null;
    client_type?: ClientType | null;
    price_kzt?: number | null;
    currency?: "KZT" | "OTHER" | null;
    advance_percent?: number | null;
    advance_amount_kzt?: number | null;
    months?: number | null;
    vehicle_model_id?: number | null;
    contact_name?: string | null;
    contact_phone?: string | null;
  }) {
    const applied: string[] = [];
    const errors: string[] = [];
    const next = { ...this.state.values };

    if (args.currency === "OTHER") errors.push("Расчет и заявка ведутся только в тенге (KZT).");
    if (args.subject !== undefined && args.subject !== null) {
      const checked = validateField("subject", args.subject);
      if (checked.ok) next.subject = checked.value;
      else errors.push(checked.error);
    }
    if (args.client_type != null) {
      const checked = validateField("clientType", args.client_type);
      if (checked.ok) next.clientType = checked.value;
      else errors.push(checked.error);
    }
    if (args.vehicle_model_id != null) {
      let found = false;
      try {
        const catalog = await this.deps.getCatalog();
        found = catalog.models.some((m) => m.id === args.vehicle_model_id);
      } catch {
        errors.push("Справочник моделей сейчас недоступен.");
      }
      if (found) next.modelId = args.vehicle_model_id;
      else if (!errors.length)
        errors.push("Такой модели нет в справочнике BCC. Используйте find_vehicle.");
    }
    if (args.price_kzt != null && args.currency !== "OTHER") {
      const checked = validateField("price", args.price_kzt);
      if (checked.ok) next.price = checked.value;
      else errors.push(checked.error);
    }

    // Check against the tariffs of the vehicle the calculator actually uses (chosen or example).
    const terms = await this.termsFor(next);
    const advances = [...new Set(terms?.rates.map((r) => r.advancePercent))].sort((a, b) => a - b);
    const monthsList = [...new Set(terms?.rates.map((r) => r.months))].sort((a, b) => a - b);

    let advance = args.advance_percent ?? null;
    if (advance === null && args.advance_amount_kzt != null) {
      if (!next.price)
        errors.push("Чтобы указать аванс суммой, сначала нужна стоимость автомобиля.");
      else if (args.advance_amount_kzt <= 0 || args.advance_amount_kzt >= next.price)
        errors.push("Аванс суммой должен быть больше 0 и меньше стоимости.");
      else {
        const exact = (args.advance_amount_kzt / next.price) * 100;
        const rounded = Math.round(exact * 100) / 100;
        if (Math.abs(exact - rounded) > 1e-9 || (advances.length && !advances.includes(rounded)))
          errors.push(
            `Аванс ${args.advance_amount_kzt} ₸ — это ${percent(rounded)}% стоимости. ` +
              (advances.length
                ? `Для выбранной модели доступны авансы: ${advances.map((a) => `${percent(a)}%`).join(", ")}.`
                : "Уточните аванс в процентах."),
          );
        else advance = rounded;
      }
    }
    if (advance !== null) {
      const checked = validateField("advancePercent", advance);
      if (!checked.ok) errors.push(checked.error);
      else if (advances.length && !advances.includes(checked.value))
        errors.push(
          `Аванс ${percent(checked.value)}% недоступен для выбранной модели. Доступны: ${advances
            .map((a) => `${percent(a)}%`)
            .join(", ")}.`,
        );
      else next.advancePercent = checked.value;
    }
    if (args.months != null) {
      const checked = validateField("months", args.months);
      if (!checked.ok) errors.push(checked.error);
      else if (monthsList.length && !monthsList.includes(checked.value))
        errors.push(
          `Срок ${checked.value} мес. недоступен для выбранной модели. Доступны: ${monthsList.join(", ")} мес.`,
        );
      else next.months = checked.value;
    }
    if (args.contact_name != null) {
      const checked = validateField("contactName", args.contact_name);
      if (checked.ok) next.contactName = checked.value;
      else errors.push(checked.error);
    }
    if (args.contact_phone != null) {
      const checked = validateField("contactPhone", args.contact_phone);
      if (checked.ok) next.contactPhone = checked.value;
      else errors.push(checked.error);
    }

    for (const field of Object.keys(next) as DraftField[]) {
      if (next[field] !== this.state.values[field]) {
        this.set(field, next[field] as never);
        applied.push(FIELD_LABELS[field]);
      }
    }
    // Re-stating an example value confirms it without changing it.
    const confirmations: Array<[unknown, DraftField]> = [
      [args.client_type, "clientType"],
      [args.vehicle_model_id, "modelId"],
      [args.price_kzt, "price"],
      [args.advance_percent ?? (advance !== null ? advance : undefined), "advancePercent"],
      [args.months, "months"],
    ];
    for (const [arg, field] of confirmations)
      if (
        arg != null &&
        arg === next[field] &&
        this.state.sources[field] === "default" &&
        next[field] === this.state.values[field]
      ) {
        this.set(field, next[field] as never);
        applied.push(FIELD_LABELS[field]);
      }

    return {
      applied,
      errors,
      draft: await this.getDraft(),
    };
  }

  async findVehicle(args: { query: string }) {
    const query = String(args.query ?? "").slice(0, 80);
    try {
      const catalog = await this.deps.getCatalog();
      let matches = searchModels(catalog.models, query);
      if (!matches.length) matches = findVehiclesInText(catalog.models, query).slice(0, 8);
      const options = matches.map((m) => ({
        id: m.id,
        label: modelLabel(m),
        partner: m.partnerName,
      }));
      if (options.length) this.card({ type: "vehicles", options });
      return {
        matches: options,
        note: options.length
          ? "Одинаковая модель у разных партнеров — разные записи. Если вариантов больше одного, попросите клиента выбрать."
          : "Ничего не найдено. Попросите написать марку и модель латиницей.",
      };
    } catch {
      return { error: "Справочник моделей сейчас недоступен." };
    }
  }

  /** Vehicles named in free text (fallback mode); shows a choice card when ambiguous. */
  async vehiclesInText(text: string) {
    try {
      const catalog = await this.deps.getCatalog();
      const found = findVehiclesInText(catalog.models, text);
      if (found.length > 1)
        this.card({
          type: "vehicles",
          options: found
            .slice(0, 8)
            .map((m) => ({ id: m.id, label: modelLabel(m), partner: m.partnerName })),
        });
      return found;
    } catch {
      return [];
    }
  }

  async getConditions() {
    const { values } = this.state;
    const terms = await this.termsFor();
    if (!terms) return { error: "Не удалось получить условия BCC. Предложите повторить позже." };
    if (!terms.rates.length)
      return {
        vehicle: await this.label(),
        error: "Для этой модели и типа клиента нет доступных условий.",
      };
    return {
      vehicle: await this.label(),
      clientType: values.clientType,
      source:
        terms.source === "live"
          ? "актуальные тарифы BCC"
          : `сохраненные тарифы от ${terms.checkedAt.slice(0, 10)}`,
      combinations: terms.rates
        .map((r) => ({
          months: r.months,
          advancePercent: r.advancePercent,
          annualRatePercent: r.annualRate,
        }))
        .sort((a, b) => a.months - b.months || a.advancePercent - b.advancePercent),
      priceLimitsByAdvance: terms.limits
        .filter((l) => terms.rates.some((r) => r.advancePercent === l.advancePercent))
        .map((l) => ({
          advancePercent: l.advancePercent,
          minPriceKzt: l.minPrice,
          maxPriceKzt: l.maxPrice,
        })),
      note: "Ставка — годовая процентная ставка тарифной строки, не ГЭСВ. Комиссии, страхование и выкуп не входят.",
    };
  }

  async calculate() {
    const { values } = this.state;
    if (!values.price) return { error: "Нужна стоимость автомобиля." };
    const terms = await this.termsFor();
    if (!terms)
      return { error: "Не удалось получить условия BCC для расчета. Предложите повторить позже." };
    const rate = terms.rates.find(
      (r) => r.months === values.months && r.advancePercent === values.advancePercent,
    );
    if (!rate)
      return {
        error: `Сочетания ${values.months} мес. и аванса ${percent(values.advancePercent)}% нет в тарифах выбранной модели.`,
        available: terms.rates.map((r) => `${r.months} мес. / ${percent(r.advancePercent)}%`),
      };
    if (!isPriceAllowed(values.price, rate, terms.limits)) {
      const limit = terms.limits.find((l) => l.advancePercent === rate.advancePercent);
      return {
        error: limit
          ? `При авансе ${percent(rate.advancePercent)}% стоимость должна быть от ${limit.minPrice} до ${limit.maxPrice} ₸.`
          : "Не удалось подтвердить допустимую стоимость для этого аванса.",
      };
    }
    const quote = calculateQuote(values.price, rate);
    const view: QuoteView = {
      modelLabel: await this.label(),
      clientType: values.clientType,
      price: quote.price,
      advancePercent: rate.advancePercent,
      advanceAmount: quote.advanceAmount,
      principal: quote.principal,
      months: rate.months,
      annualRate: rate.annualRate,
      monthlyPayment: quote.monthlyPayment,
      source: terms.source,
      checkedAt: terms.checkedAt,
    };
    this.card({ type: "quote", quote: view });
    return {
      preliminary: true,
      monthlyPaymentKzt: quote.monthlyPayment,
      advanceKzt: quote.advanceAmount,
      financingKzt: quote.principal,
      annualRatePercent: rate.annualRate,
      months: rate.months,
      totalWithAdvanceKzt: quote.totalWithAdvance,
      tariffs:
        terms.source === "live" ? "актуальные" : `сохраненные от ${terms.checkedAt.slice(0, 10)}`,
      note: "Предварительный расчет без комиссий, страхования и выкупа. Не оферта.",
    };
  }

  async findOffers(args: {
    max_monthly_kzt: number;
    max_advance_kzt: number;
    locked_months?: number | null;
  }) {
    const { values } = this.state;
    const maxMonthly = Number(args.max_monthly_kzt);
    const maxAdvance = Number(args.max_advance_kzt);
    if (!values.price) return { error: "Нужна стоимость автомобиля." };
    if (!Number.isFinite(maxMonthly) || maxMonthly <= 0 || maxMonthly > 999_999_999)
      return { error: "Некорректный желаемый платеж." };
    if (!Number.isFinite(maxAdvance) || maxAdvance < 0 || maxAdvance > 999_999_999)
      return { error: "Некорректный лимит аванса." };
    const terms = await this.termsFor();
    if (!terms) return { error: "Не удалось получить условия BCC." };
    const locked = args.locked_months ?? undefined;
    const offers = findOffers({
      price: values.price,
      rates: terms.rates,
      limits: terms.limits,
      maxMonthly,
      maxAdvance,
      lockedMonths: locked,
    })
      .filter(
        (o, i, all) =>
          all.findIndex(
            (x) =>
              x.rate.months === o.rate.months && x.rate.advancePercent === o.rate.advancePercent,
          ) === i,
      )
      .slice(0, 3);
    if (offers.length) {
      this.card({ type: "offers", offers, maxMonthly, clientType: values.clientType });
      return {
        offers: offers.map((o) => ({
          months: o.rate.months,
          advancePercent: o.rate.advancePercent,
          advanceKzt: o.advanceAmount,
          monthlyPaymentKzt: o.monthlyPayment,
          annualRatePercent: o.rate.annualRate,
        })),
        note: "Клиент применяет вариант кнопкой в карточке. Это предварительные варианты.",
      };
    }
    const maxPrice = estimateMaxPrice({
      rates: terms.rates,
      limits: terms.limits,
      maxMonthly,
      maxAdvance,
      lockedMonths: locked,
    });
    return {
      offers: [],
      reason: "При этих ограничениях подходящих сочетаний в тарифах нет.",
      maxAffordablePriceKzt: maxPrice && maxPrice < values.price ? Math.floor(maxPrice) : null,
    };
  }

  checkApplication() {
    const missing = missingFields(this.state);
    this.card({ type: "missing", fields: missing });
    return {
      ready: missing.length === 0,
      missing: missing.map((f) => FIELD_LABELS[f]),
      note: "Перед отправкой также нужен корректный расчет (calculate без ошибки) и согласие клиента в форме.",
    };
  }

  async prepareSubmission() {
    const missing = missingFields(this.state);
    if (missing.length) {
      this.card({ type: "missing", fields: missing });
      return { ready: false, missing: missing.map((f) => FIELD_LABELS[f]) };
    }
    const quote = await this.calculate();
    if ("error" in quote) return { ready: false, error: quote.error };
    this.card({ type: "summary" });
    return {
      ready: true,
      note: "Клиенту показан итог с кнопкой «Отправить заявку». Отправка — только после его подтверждения.",
    };
  }

  requestManager() {
    return {
      available: false,
      message:
        "Передача обращения менеджеру из чата не подключена. Клиент может отправить заявку в этом сервисе или обратиться в BCC Leasing через официальный сайт.",
    };
  }
}

type ToolDefinition = {
  type: "function";
  function: {
    name: string;
    description: string;
    parameters: Record<string, unknown>;
    strict: true;
  };
};

const nullable = (type: string, extra: object = {}) => ({ type: [type, "null"], ...extra });

export const TOOL_DEFINITIONS: ToolDefinition[] = [
  {
    type: "function",
    function: {
      name: "get_draft",
      description:
        "Прочитать текущий черновик заявки: параметры калькулятора, контакты (замаскированы) и чего не хватает.",
      parameters: { type: "object", properties: {}, required: [], additionalProperties: false },
      strict: true,
    },
  },
  {
    type: "function",
    function: {
      name: "update_draft",
      description:
        "Сохранить в черновик только значения, явно названные клиентом. Неназванные поля передавай как null. Сервер проверяет значения и вернет ошибки.",
      parameters: {
        type: "object",
        properties: {
          subject: nullable("string", {
            enum: ["car", null],
            description: "car — легковой автомобиль",
          }),
          client_type: nullable("string", { enum: ["IP", "TOO", null] }),
          price_kzt: nullable("integer", { description: "Стоимость автомобиля в тенге" }),
          currency: nullable("string", {
            enum: ["KZT", "OTHER", null],
            description: "OTHER — если клиент назвал не тенге",
          }),
          advance_percent: nullable("number", { description: "Аванс в процентах" }),
          advance_amount_kzt: nullable("integer", { description: "Аванс суммой в тенге" }),
          months: nullable("integer", { description: "Срок в месяцах; годы × 12" }),
          vehicle_model_id: nullable("integer", { description: "ID модели из find_vehicle" }),
          contact_name: nullable("string"),
          contact_phone: nullable("string"),
        },
        required: [
          "subject",
          "client_type",
          "price_kzt",
          "currency",
          "advance_percent",
          "advance_amount_kzt",
          "months",
          "vehicle_model_id",
          "contact_name",
          "contact_phone",
        ],
        additionalProperties: false,
      },
      strict: true,
    },
  },
  {
    type: "function",
    function: {
      name: "find_vehicle",
      description:
        "Найти автомобиль в справочнике BCC по марке/модели/продавцу. Возвращает ID и партнера.",
      parameters: {
        type: "object",
        properties: { query: { type: "string" } },
        required: ["query"],
        additionalProperties: false,
      },
      strict: true,
    },
  },
  {
    type: "function",
    function: {
      name: "get_conditions",
      description:
        "Доступные сроки, авансы, ставки и лимиты стоимости для текущей модели и типа клиента.",
      parameters: { type: "object", properties: {}, required: [], additionalProperties: false },
      strict: true,
    },
  },
  {
    type: "function",
    function: {
      name: "calculate",
      description:
        "Предварительный расчет платежа по текущему черновику калькулятором BCC. Никогда не считай сам.",
      parameters: { type: "object", properties: {}, required: [], additionalProperties: false },
      strict: true,
    },
  },
  {
    type: "function",
    function: {
      name: "find_offers",
      description: "Подобрать срок и аванс под желаемый ежемесячный платеж и лимит аванса.",
      parameters: {
        type: "object",
        properties: {
          max_monthly_kzt: { type: "integer" },
          max_advance_kzt: { type: "integer" },
          locked_months: nullable("integer"),
        },
        required: ["max_monthly_kzt", "max_advance_kzt", "locked_months"],
        additionalProperties: false,
      },
      strict: true,
    },
  },
  {
    type: "function",
    function: {
      name: "check_application",
      description: "Проверить готовность заявки: каких данных не хватает.",
      parameters: { type: "object", properties: {}, required: [], additionalProperties: false },
      strict: true,
    },
  },
  {
    type: "function",
    function: {
      name: "prepare_submission",
      description: "Показать клиенту итог заявки с кнопкой отправки. Сам не отправляет.",
      parameters: { type: "object", properties: {}, required: [], additionalProperties: false },
      strict: true,
    },
  },
  {
    type: "function",
    function: {
      name: "request_manager",
      description: "Передать обращение менеджеру BCC Leasing.",
      parameters: {
        type: "object",
        properties: { reason: { type: "string" } },
        required: ["reason"],
        additionalProperties: false,
      },
      strict: true,
    },
  },
];

export async function runTool(
  session: ToolSession,
  name: string,
  rawArgs: string,
): Promise<unknown> {
  let args: Record<string, unknown> = {};
  try {
    args = rawArgs ? (JSON.parse(rawArgs) as Record<string, unknown>) : {};
  } catch {
    return { error: "Некорректные аргументы инструмента." };
  }
  switch (name) {
    case "get_draft":
      return session.getDraft();
    case "update_draft":
      return session.updateDraft(args as Parameters<ToolSession["updateDraft"]>[0]);
    case "find_vehicle":
      return session.findVehicle(args as { query: string });
    case "get_conditions":
      return session.getConditions();
    case "calculate":
      return session.calculate();
    case "find_offers":
      return session.findOffers(args as Parameters<ToolSession["findOffers"]>[0]);
    case "check_application":
      return session.checkApplication();
    case "prepare_submission":
      return session.prepareSubmission();
    case "request_manager":
      return session.requestManager();
    default:
      return { error: `Неизвестный инструмент ${name}.` };
  }
}
