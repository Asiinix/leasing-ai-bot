import { findNumbers, normalize } from "../../lib/assistant";
import { money } from "../../lib/format";
import { BUSINESS_BUDGET_INTAKE } from "./prompts";

type Field = "taxes" | "revenue" | "expenses" | "obligations" | "reserve" | "advance";
type Step = Field | "complete";

export interface BusinessBudgetState {
  /** Taxes, receipts, operating expenses and existing debt payments are annual. */
  values: Partial<Record<Field, number>>;
  step: Step;
  expensesIncludeTaxes: boolean;
  expensesIncludeObligations: boolean;
}

export interface BusinessBudgetTurn {
  state: BusinessBudgetState | null;
  reply: string;
  budget?: { maxMonthly: number; maxAdvance: number };
}

const MAX_AMOUNT = 1_000_000_000_000;
const MARKERS: Array<{ field: Field; pattern: RegExp }> = [
  { field: "taxes", pattern: /(?<!\p{L})(?:налог[а-я]*|кпн|ипн|ндс)(?!\p{L})/gu },
  {
    field: "revenue",
    pattern: /(?<!\p{L})(?:выручк[а-я]*|оборот[а-я]*|доход[а-я]*|поступлени[а-я]*)(?!\p{L})/gu,
  },
  { field: "expenses", pattern: /(?<!\p{L})(?:расход[а-я]*|затрат[а-я]*)(?!\p{L})/gu },
  {
    field: "obligations",
    pattern: /(?<!\p{L})(?:обязательств[а-я]*|кредит[а-я]*|долг[а-я]*)(?!\p{L})/gu,
  },
  {
    field: "reserve",
    pattern:
      /(?<!\p{L})(?:резерв[а-я]*|сохраня[а-я]*|оставля[а-я]*|оставить|сохранить|нужды\s+бизнеса)(?!\p{L})/gu,
  },
  { field: "advance", pattern: /аванс[а-я]*|первоначальн[а-я]*\s+взнос[а-я]*/gu },
];

const BUSINESS_START =
  /(?<!\p{L})(?:налог[а-я]*|кпн|ипн|ндс|выручк[а-я]*|оборот[а-я]*|доход[а-я]*|расход[а-я]*|прибыл[а-я]*)(?!\p{L})/u;
const CONTINUATION =
  /резерв|нужды бизнеса|обязательств|кредит|долг|сохраня|оставить|оставля|сохранить/u;
const PERIOD_HINT = "Суммы без периода считаю **за год**.";
const UNSUPPORTED_PERIOD =
  /(?:за|в)\s+(?:[2-9]|1[0-9]|2[0-9]|два|две|три|четыре|пять|шесть|полгода)\s*(?:месяц|мес\b|год|лет|квартал)|полугод|полгода/u;

function fresh(): BusinessBudgetState {
  return {
    values: {},
    step: "taxes",
    expensesIncludeTaxes: false,
    expensesIncludeObligations: false,
  };
}

function explicitPeriod(clause: string): { months: number; error?: string } {
  // Do not silently treat totals for several months or years as a single period.
  if (UNSUPPORTED_PERIOD.test(clause))
    return {
      months: 12,
      error:
        "Укажите сумму за **один год, квартал или месяц** — так я корректно приведу показатели к году.",
    };
  const periods: number[] = [];
  if (
    /ежемесячн|месячн|(?:за|в)\s+(?:(?:прошлый|текущий|этот|один)\s+)?(?:месяц|мес(?![а-я]))|\/\s*мес/u.test(
      clause,
    )
  )
    periods.push(1);
  if (
    /ежеквартальн|квартальн|(?:за|в)\s+(?:(?:прошлый|текущий|этот|один|[1-4])\s+)?квартал/u.test(
      clause,
    )
  )
    periods.push(3);
  if (
    /ежегодн|годов|(?:за|в)\s+(?:(?:прошлый|текущий|этот|один)\s+)?год|за\s+\d{4}(?!\d)/u.test(
      clause,
    )
  )
    periods.push(12);
  if (periods.length > 1)
    return {
      months: 12,
      error:
        "Вижу разные периоды. Напишите каждый показатель отдельной фразой, например: «Выручка 120 млн за год, расходы 6 млн в месяц».",
    };
  return { months: periods[0] ?? 0 };
}

function parseValues(text: string, state: BusinessBudgetState) {
  const values: Partial<Record<Field, number>> = {};
  let noObligations =
    state.step === "obligations" && /^(?:нет|никаких|ничего|не плачу)[.! ]*$/u.test(text);
  // Preserve decimal commas and decimal points in amounts.
  const clauses = text.split(/(?<!\d),|,(?!\d)|[;!?\n]|(?<!\d)\.(?!\d)/u);
  for (const clause of clauses) {
    if (UNSUPPORTED_PERIOD.test(clause)) return { error: explicitPeriod(clause).error! };
    const numbers = findNumbers(clause).filter(
      (number) =>
        !(
          number.value >= 1900 &&
          number.value <= 2199 &&
          (/^\s*год/u.test(clause.slice(number.end)) ||
            /за\s*$/u.test(clause.slice(0, number.start)))
        ),
    );
    const markers = MARKERS.flatMap(({ field, pattern }) =>
      [...clause.matchAll(pattern)].map((m) => ({
        field,
        start: m.index!,
        end: m.index! + m[0].length,
      })),
    ).sort((a, b) => a.start - b.start);
    for (const absence of clause.matchAll(
      /(?:обязательств[а-я]*|кредит[а-я]*|долг[а-я]*)\s+(?:нет|не\s+имею)|(?:нет|без)\s+(?:обязательств[а-я]*|кредит[а-я]*|долг[а-я]*)/gu,
    )) {
      // “Расходы без кредитов” describes expense composition, not zero debt.
      const precedingField = markers
        .filter((marker) => marker.end <= absence.index! && marker.field !== "taxes")
        .at(-1)?.field;
      if (absence[0].startsWith("без") && precedingField === "expenses") continue;
      noObligations = true;
    }
    const usedMarkers = new Set<(typeof markers)[number]>();
    const assignments = numbers.map((number, i) => {
      const candidates = markers.filter(
        (marker) =>
          !usedMarkers.has(marker) &&
          marker.start >= (numbers[i - 1]?.end ?? 0) &&
          marker.end <= (numbers[i + 1]?.start ?? clause.length),
      );
      const nearest = candidates.sort((a, b) => distance(a) - distance(b))[0];
      function distance(marker: { start: number; end: number }) {
        return marker.end <= number.start
          ? number.start - marker.end
          : marker.start - number.end + 2;
      }
      if (nearest) usedMarkers.add(nearest);
      // An adjective directly preceding a field belongs to that field:
      // “ежемесячная выручка”. Keep “в месяц” attached to the previous amount.
      const periodAdjective = nearest
        ? clause
            .slice(0, nearest.start)
            .match(
              /(?<!\p{L})(?:ежемесячн|месячн|ежеквартальн|квартальн|ежегодн|годов)(?:ая|ый|ые|ое|ую|ой|ых|ым|ом|ыми)\s+$/u,
            )?.[0]
        : undefined;
      const fieldStart = nearest ? nearest.start - (periodAdjective?.length ?? 0) : number.start;
      return { nearest, start: Math.min(number.start, fieldStart) };
    });
    for (let i = 0; i < numbers.length; i++) {
      const number = numbers[i];
      const before = clause.slice(numbers[i - 1]?.end ?? 0, number.start);
      const after = clause.slice(number.end, numbers[i + 1]?.start ?? clause.length);
      const { nearest } = assignments[i];
      // Voice transcripts may omit punctuation: a period belongs to its own
      // labelled amount, so “резерв ... в месяц” cannot annualize all fields.
      const segment = clause.slice(
        i === 0 ? 0 : assignments[i].start,
        assignments[i + 1]?.start ?? clause.length,
      );
      const period = explicitPeriod(segment);
      if (period.error) return { error: period.error };
      if (!nearest && /прибыл/u.test(clause))
        return {
          error:
            "Прибыль не буду принимать за сумму налогов. Для этого подбора укажите отдельно **налоги, выручку и расходы**; без периода считаю их за год.",
        };
      const field =
        nearest?.field ??
        (numbers.length === 1 && state.step !== "complete" ? state.step : undefined);
      if (!field)
        return {
          error:
            "Укажите, к чему относится сумма: **налоги, выручка, расходы, обязательства, резерв или аванс**.",
        };
      if (
        /[−–-]\s*$|минус\s*$|(?<!\p{L})не\s*$/u.test(before) ||
        /^\s*(?:%|процент|\$|€|₽|usd|eur|rub|доллар|евро|рубл)/u.test(after)
      )
        return {
          error:
            "Укажите итоговую **неотрицательную сумму в тенге**, без процентов. Например: «Расходы 76 млн».",
        };
      if (
        !number.scaled &&
        number.value > 0 &&
        number.value < 1_000 &&
        !/^\s*(?:₸|тенге|тг(?![а-я])|kzt)/u.test(after)
      )
        return {
          error: `Уточните единицы для «${number.raw}»: **тенге, тысячи или миллионы**? Например: «${number.raw} млн».`,
          awaiting: field,
        };
      const months = period.months || (field === "reserve" ? 1 : 12);
      const value =
        field === "advance"
          ? number.value
          : field === "reserve"
            ? number.value / months
            : (number.value * 12) / months;
      if (!Number.isFinite(value) || value < 0 || value > MAX_AMOUNT)
        return {
          error:
            "Проверьте сумму: для демо принимаю значения **от 0 до 1 трлн ₸** после приведения к периоду.",
        };
      if (values[field] !== undefined && values[field] !== value)
        return {
          error: "Вижу несколько значений одного показателя. Укажите только **итоговую сумму**.",
        };
      values[field] = Math.round(value * 100) / 100;
    }
  }
  if (noObligations) {
    if (values.obligations !== undefined && values.obligations > 0)
      return {
        error:
          "Указана сумма обязательств, но также написано, что их нет. Уточните **итоговую сумму платежей по обязательствам** или напишите **«обязательств нет»**.",
        awaiting: "obligations" as const,
      };
    values.obligations = 0;
  }
  if (/без\s+аванса|аванс\s+нулевой/u.test(text)) values.advance = 0;
  return { values };
}

/** Demo cash surplus, not accounting/tax profit or a lender's credit decision. */
export function calculateBusinessBudget(state: BusinessBudgetState) {
  const v = state.values;
  if ([v.taxes, v.revenue, v.expenses, v.obligations].some((value) => value === undefined))
    return null;
  const annualSurplus =
    v.revenue! -
    v.expenses! -
    (state.expensesIncludeTaxes ? 0 : v.taxes!) -
    (state.expensesIncludeObligations ? 0 : v.obligations!);
  const monthlySurplus = Math.floor(annualSurplus / 12);
  const reserve = v.reserve ?? Math.ceil(Math.max(0, monthlySurplus) * 0.75);
  return { annualSurplus, monthlySurplus, reserve, maxMonthly: monthlySurplus - reserve };
}

function summary(
  state: BusinessBudgetState,
  result: NonNullable<ReturnType<typeof calculateBusinessBudget>>,
) {
  const v = state.values;
  const basis = `Выручка — **${money(v.revenue!)}**, расходы — **${money(v.expenses!)}**, налоги — **${money(v.taxes!)}**, текущие обязательства — **${money(v.obligations!)}** за год.`;
  const inclusion =
    state.expensesIncludeTaxes || state.expensesIncludeObligations
      ? ` В расходах уже учтены ${[state.expensesIncludeTaxes && "налоги", state.expensesIncludeObligations && "обязательства"].filter(Boolean).join(" и ")} — повторно их не вычитаю.`
      : " Расходы учтены отдельно от налогов и обязательств.";
  return `${basis}${inclusion}\n\nПосле расходов, налогов и текущих обязательств остаётся **${money(result.monthlySurplus)} в месяц**. Это предварительная оценка свободного остатка по вашим данным.\n\n${v.reserve === undefined ? "Предлагаю сохранять" : "Сохраняем"} **${money(result.reserve)} в месяц** на нужды бизнеса${v.reserve === undefined ? " — 75% остатка; эту сумму можно изменить" : ""}. На лизинг остаётся **до ${money(Math.max(0, result.maxMonthly))} в месяц**.`;
}

export function advanceBusinessBudget(
  input: string,
  previous: BusinessBudgetState | null,
): BusinessBudgetTurn | null {
  const text = normalize(input);
  if (previous && /^(?:отмена|отменить|выйти|подбор по платежу)[.! ]*$/u.test(text))
    return {
      state: null,
      reply: "Вернёмся к подбору по бюджету. Укажите **платёж в месяц и сумму аванса**.",
    };
  const restart = /начать (?:заново|сначала)|новый расчет бизнеса/u.test(text);
  const started = BUSINESS_START.test(text) || /финанс[а-я]* бизнеса/u.test(text);
  if (
    !started &&
    (!previous || (previous.step === "complete" && !CONTINUATION.test(text) && !restart))
  )
    return null;
  const base = restart ? fresh() : (previous ?? fresh());
  const parsed = parseValues(text, base);
  if (parsed.error)
    return { state: { ...base, step: parsed.awaiting ?? base.step }, reply: parsed.error };
  const state: BusinessBudgetState = { ...base, values: { ...base.values, ...parsed.values } };
  if (
    /расход[а-я]*[^;.!?]{0,50}(?:включая|включают|учтены|входят|с учетом)[^;.!?]{0,25}налог/u.test(
      text,
    ) ||
    /налог[а-я]*[^;.!?]{0,20}(?:включены|учтены|входят)\s+в\s+расход/u.test(text)
  )
    state.expensesIncludeTaxes = true;
  if (
    /расход[а-я]*[^;.!?]{0,50}(?:включая|включают|учтены|входят|с учетом)[^;.!?]{0,25}(?:обязательств|кредит)/u.test(
      text,
    ) ||
    /(?:обязательств|кредит)[а-я]*[^;.!?]{0,20}(?:включены|учтены|входят)\s+в\s+расход/u.test(text)
  )
    state.expensesIncludeObligations = true;
  if (/расход[а-я]*[^;.!?]{0,30}(?:без|не включают)\s+налог/u.test(text))
    state.expensesIncludeTaxes = false;
  if (/расход[а-я]*[^;.!?]{0,30}(?:без|не включают)\s+(?:обязательств|кредит)/u.test(text))
    state.expensesIncludeObligations = false;
  const v = state.values;
  const withIntake = (reply: string) =>
    !previous || restart ? `${reply}\n\n${BUSINESS_BUDGET_INTAKE}` : reply;
  if (v.taxes === undefined)
    return {
      state: { ...state, step: "taxes" },
      reply: withIntake(`Сколько налогов вы заплатили **за год**? Например: «20 млн налогов».`),
    };
  if (v.revenue === undefined)
    return {
      state: { ...state, step: "revenue" },
      reply: withIntake(
        `Учёл налоги: **${money(v.taxes)} за год**. Какая у вас **выручка и расходы за год**? Расходы укажите **без налогов и платежей по кредитам**, чтобы не вычесть их дважды. Например: «Выручка 120 млн, расходы 76 млн». ${previous ? PERIOD_HINT : ""}`,
      ),
    };
  if (v.expenses === undefined)
    return {
      state: { ...state, step: "expenses" },
      reply: withIntake(
        `Выручка — **${money(v.revenue)} за год**. Укажите **расходы за год без налогов и платежей по кредитам**. Например: «Расходы 76 млн».`,
      ),
    };
  if (v.obligations === undefined)
    return {
      state: { ...state, step: "obligations" },
      reply: withIntake(
        `Сколько платите по **действующим кредитам, лизингам и другим обязательствам за год**? Например: «6 млн» или «500 тысяч в месяц». Если таких платежей нет, напишите **«нет»**.`,
      ),
    };
  const result = calculateBusinessBudget(state)!;
  if (result.monthlySurplus <= 0)
    return {
      state: { ...state, step: "complete" },
      reply: `По указанным данным после расходов, налогов и обязательств **нет положительного свободного остатка**: **${money(result.annualSurplus)} за год**. Подбирать дополнительный платёж на этой основе не буду. Можно исправить выручку, расходы или обязательства.`,
    };
  if (result.maxMonthly <= 0)
    return {
      state: { ...state, step: "reserve" },
      reply: `Свободный остаток — **${money(result.monthlySurplus)} в месяц**, резерв — **${money(result.reserve)} в месяц**. На лизинг средств не остаётся. Укажите меньший **резерв в месяц** или измените финансовые показатели.`,
    };
  if (v.advance === undefined || v.advance === 0)
    return {
      state: { ...state, step: "advance" },
      reply: `${summary(state, result)}\n\n${v.advance === 0 ? "В доступных условиях требуется аванс. " : ""}**Сколько готовы внести первоначально?** Например: «Аванс 3 млн». Резерв можно изменить: «Резерв 1 млн в месяц, аванс 3 млн».`,
    };
  return {
    state: { ...state, step: "complete" },
    reply: `${summary(state, result)}\n\nПодбираю автомобили с платежом **до ${money(result.maxMonthly)} в месяц** и авансом **до ${money(v.advance)}**. Страхование рассчитывается отдельно; это предварительный подбор, а не одобрение лизинга.`,
    budget: { maxMonthly: result.maxMonthly, maxAdvance: v.advance },
  };
}
