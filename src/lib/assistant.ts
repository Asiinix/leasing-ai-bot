/** Local, deterministic demo parser. It does not call an LLM or calculate finance. */
export interface ParsedIntent {
  /** Omitted slots preserve the current form value; null explicitly releases the term. */
  maxMonthly?: number;
  maxAdvance?: number;
  price?: number;
  months?: number | null;
  clientType?: "IP" | "TOO";
  action: "calculate" | "lower_payment" | "lower_advance" | "explain" | "unknown";
  clarification?: string;
  /** One known money field awaiting clarification; absent for unknown/multiple fields. */
  clarificationSlot?: "maxMonthly" | "maxAdvance" | "price";
}

type MoneySlot = "maxMonthly" | "maxAdvance" | "price";
type Slot = MoneySlot | "months";
export type NumberSpan = {
  raw: string;
  value: number;
  start: number;
  end: number;
  scaled: boolean;
};

const WORD_VALUES: Record<string, number> = {
  ноль: 0,
  нулевой: 0,
  один: 1,
  одна: 1,
  одно: 1,
  одну: 1,
  одного: 1,
  два: 2,
  две: 2,
  двух: 2,
  три: 3,
  трех: 3,
  четыре: 4,
  четырех: 4,
  пять: 5,
  пяти: 5,
  шесть: 6,
  шести: 6,
  семь: 7,
  семи: 7,
  восемь: 8,
  восьми: 8,
  девять: 9,
  девяти: 9,
  десять: 10,
  десяти: 10,
  одиннадцать: 11,
  двенадцать: 12,
  тринадцать: 13,
  четырнадцать: 14,
  пятнадцать: 15,
  шестнадцать: 16,
  семнадцать: 17,
  восемнадцать: 18,
  девятнадцать: 19,
  двадцать: 20,
  тридцать: 30,
  сорок: 40,
  пятьдесят: 50,
  шестьдесят: 60,
  семьдесят: 70,
  восемьдесят: 80,
  девяносто: 90,
  сто: 100,
  двести: 200,
  триста: 300,
  четыреста: 400,
  пятьсот: 500,
  шестьсот: 600,
  семьсот: 700,
  восемьсот: 800,
  девятьсот: 900,
  полтора: 1.5,
  полторы: 1.5,
};

const SCALES: Record<string, number> = {
  тыс: 1_000,
  тысяч: 1_000,
  тысяча: 1_000,
  тысячи: 1_000,
  тысячу: 1_000,
  млн: 1_000_000,
  миллион: 1_000_000,
  миллиона: 1_000_000,
  миллионов: 1_000_000,
  млрд: 1_000_000_000,
  миллиард: 1_000_000_000,
  миллиарда: 1_000_000_000,
  миллиардов: 1_000_000_000,
};

const alternatives = (values: string[]) => values.sort((a, b) => b.length - a.length).join("|");
const scalePattern = alternatives(Object.keys(SCALES));
const wordPattern = alternatives([...Object.keys(WORD_VALUES), ...Object.keys(SCALES)]);
const numberPattern = new RegExp(
  `(?<![\\p{L}\\d])(?:` +
    `(?:\\d{1,3}(?: \\d{3})+(?:[.,]\\d+)?|\\d+(?:[.,]\\d+)?)` +
    `(?:\\s*(?:${scalePattern})(?!\\p{L}))?` +
    `|(?:${wordPattern})(?!\\p{L})(?:\\s+(?:${wordPattern})(?!\\p{L}))*)` +
    `(?![\\p{L}\\d])`,
  "gu",
);

const MARKERS: ReadonlyArray<{ slot: Slot; pattern: RegExp }> = [
  {
    slot: "maxAdvance",
    pattern: /аванс[а-я]*|первоначальн[а-я]*\s+(?:взнос[а-я]*|платеж[а-я]*)|первый\s+взнос/gu,
  },
  {
    slot: "maxMonthly",
    pattern: /платеж[а-я]*|платить|плачу|ежемесячн[а-я]*|в\s+месяц|в\s+мес(?![а-я])|\/\s*мес/gu,
  },
  {
    slot: "price",
    pattern:
      /(?<!\p{L})(?:цен[а-я]*|стоимост[а-я]*|стоит|машин[а-я]*|автомобил[а-я]*|оборудован[а-я]*)/gu,
  },
  { slot: "months", pattern: /срок[а-я]*/gu },
];

export function normalize(text: string): string {
  return text
    .toLowerCase()
    .replace(/ё/g, "е")
    .replace(/[\u00a0\u202f]/g, " ")
    .replace(/(?<=\p{L})(?=\d)|(?<=\d)(?=\p{L})/gu, " ")
    .replace(/(?<!\p{L})(тыс|млн|млрд)\.(?!\p{L})/gu, "$1")
    .replace(/[\t ]+/g, " ")
    .trim();
}

function parseNumber(raw: string): { value: number; scaled: boolean } {
  if (/^\d/u.test(raw)) {
    const scale = raw.match(new RegExp(`(${scalePattern})$`, "u"))?.[1];
    const numeric = scale ? raw.slice(0, -scale.length) : raw;
    return {
      value: Number(numeric.replace(/ /g, "").replace(",", ".")) * (scale ? SCALES[scale] : 1),
      scaled: !!scale,
    };
  }
  let total = 0;
  let group = 0;
  let scaled = false;
  for (const word of raw.split(/\s+/u)) {
    if (SCALES[word]) {
      total += (group || 1) * SCALES[word];
      group = 0;
      scaled = true;
    } else {
      group += WORD_VALUES[word] ?? 0;
    }
  }
  return { value: total + group, scaled };
}

export function findNumbers(text: string): NumberSpan[] {
  const spans = [...text.matchAll(numberPattern)].map((match) => ({
    raw: match[0],
    start: match.index!,
    end: match.index! + match[0].length,
    ...parseNumber(match[0]),
  }));
  const merged: NumberSpan[] = [];
  for (const span of spans) {
    const previous = merged.at(-1);
    const previousScale = previous?.raw.match(new RegExp(`(${scalePattern})$`, "u"))?.[1];
    const currentScale = span.raw.match(new RegExp(`(${scalePattern})$`, "u"))?.[1];
    // Speech/transcription can mix digits and scales: "2 млн 500 тысяч" is one amount.
    if (
      previous &&
      previousScale &&
      currentScale &&
      SCALES[previousScale] > SCALES[currentScale] &&
      /^\s+$/u.test(text.slice(previous.end, span.start))
    ) {
      previous.value += span.value;
      previous.end = span.end;
      previous.raw = text.slice(previous.start, span.end);
    } else {
      merged.push(span);
    }
  }
  return merged;
}

function surroundingText(text: string, spans: NumberSpan[], index: number) {
  const number = spans[index];
  // Adjacent numbers and clause boundaries prevent one amount from borrowing another slot.
  const before =
    text
      .slice(index ? spans[index - 1].end : 0, number.start)
      .split(/[,;.!?\n]/u)
      .at(-1) ?? "";
  const after = text
    .slice(number.end, spans[index + 1]?.start ?? text.length)
    .split(/[,;.!?\n]/u)[0];
  return { before, after };
}

function identifySlot(before: string, after: string): Slot | undefined {
  if (/^\s*(?:месяц[а-я]*|мес(?![а-я])|год[а-я]*|лет)(?![а-я])/u.test(after)) return "months";
  const candidates: Array<{ slot: Slot; score: number }> = [];
  for (const marker of MARKERS) {
    for (const match of before.matchAll(marker.pattern)) {
      candidates.push({ slot: marker.slot, score: before.length - match.index! - match[0].length });
    }
    for (const match of after.matchAll(marker.pattern)) {
      candidates.push({ slot: marker.slot, score: match.index! + 2 });
    }
  }
  return candidates.sort((a, b) => a.score - b.score)[0]?.slot;
}

function reductionAction(text: string): "lower_payment" | "lower_advance" | undefined {
  for (const clause of text.split(/[,;.!?]/u)) {
    const verb = clause.match(/сниз[а-я]*|сниж[а-я]*|уменьш[а-я]*/u);
    const smaller = clause.match(/меньш[а-я]*|пониже/u);
    if (!verb && !smaller) continue;
    // The first object after the reduction verb wins: "снизить платеж, аванс...".
    const targetText = verb ? clause.slice(verb.index! + verb[0].length) : clause;
    const target =
      targetText.match(/аванс|первоначальн[а-я]*\s+взнос|платеж|платить/u) ??
      clause.match(/аванс|первоначальн[а-я]*\s+взнос|платеж|платить/u);
    if (target) return /аванс|взнос/u.test(target[0]) ? "lower_advance" : "lower_payment";
  }
  return undefined;
}

/** Extract only explicitly supplied changes. A clarification means the UI must not auto-apply them. */
export function parseMessage(input: string): ParsedIntent {
  const text = normalize(input);
  const result: ParsedIntent = { action: "unknown" };
  if (!text) return result;
  const clarifications: string[] = [];
  const unclearMoneySlots = new Set<MoneySlot>();
  const ask = (message: string, slot?: MoneySlot) => {
    if (!clarifications.includes(message)) clarifications.push(message);
    if (slot) unclearMoneySlots.add(slot);
  };

  const hasIP = /(?<!\p{L})(?:ип|ip)(?!\p{L})|индивидуальн[а-я]*\s+предпринимател/iu.test(text);
  const hasTOO = /(?<!\p{L})(?:тоо|too)(?!\p{L})|товариществ[а-я]*\s+с\s+ограниченн/iu.test(text);
  if (hasIP && hasTOO) ask("Уточните тип клиента: ИП или ТОО.");
  else if (hasIP) result.clientType = "IP";
  else if (hasTOO) result.clientType = "TOO";

  const flexibleTerm =
    /(?:подбери|подберите|подбирать|подобрать|подбор)[^,;.!?]{0,20}срок|срок[^,;.!?]{0,20}(?:подбери|подобрать|подберите|любой|неважен)|любой\s+срок/u.test(
      text,
    );
  if (flexibleTerm && !/не\s+(?:подбира[а-я]*|подбери[а-я]*)/u.test(text)) result.months = null;
  if (/без\s+аванса|аванс\s+(?:не\s+нужен|нулевой)/u.test(text)) result.maxAdvance = 0;

  const numbers = findNumbers(text);
  let unassignedNumber = false;
  let negatedSlot: Slot | undefined;
  for (let index = 0; index < numbers.length; index++) {
    const number = numbers[index];
    const { before, after } = surroundingText(text, numbers, index);
    if (
      number.value >= 1900 &&
      number.value <= 2199 &&
      /^\s*год[а-я]*/u.test(after) &&
      !/срок/u.test(before)
    ) {
      // A stated vehicle production year is not a lease term or a vehicle price.
      unassignedNumber = true;
      continue;
    }
    let slot = identifySlot(before, after);
    if (!slot && negatedSlot && /^\s*(?:а|но)\s*$/u.test(before)) slot = negatedSlot;
    if (!slot) {
      unassignedNumber = true;
      continue;
    }
    if (/(?<!\p{L})не\s*$/u.test(before)) {
      // "Цена не 15 млн, а 20 млн": never apply the explicitly rejected value.
      negatedSlot = slot;
      continue;
    }
    if (negatedSlot === slot) negatedSlot = undefined;
    if (/[−–-]\s*$|минус\s*$/u.test(before) || !Number.isFinite(number.value)) {
      ask(
        "Укажите неотрицательные суммы и положительный срок.",
        slot === "months" ? undefined : slot,
      );
      continue;
    }
    if (slot === "months") {
      const inYears = /^\s*(?:год[а-я]*|лет)(?![а-я])/u.test(after);
      const months = number.value * (inYears ? 12 : 1);
      if (/(?<!\p{L})до\s*$|не\s+(?:более|больше)\s*$/u.test(before)) {
        ask("Укажите конкретный срок в месяцах или напишите «подбери срок».");
      } else if (number.scaled || !Number.isInteger(months) || months <= 0) {
        ask("Укажите положительный срок в целых месяцах.");
      } else {
        result.months = months;
      }
      continue;
    }
    if (/^\s*(?:%|процент)/u.test(after) || /в\s+процентах\s*$/u.test(before)) {
      ask(
        slot === "maxAdvance"
          ? "Укажите максимальный аванс суммой в тенге, например «аванс до 3 млн ₸»."
          : "Укажите желаемую сумму в тенге, а не в процентах.",
        slot,
      );
      continue;
    }
    if (/^\s*(?:\$|€|₽|usd|eur|rub|доллар|евро|рубл)/u.test(after)) {
      ask("В этом демо суммы задаются в тенге. Укажите сумму в ₸.", slot);
      continue;
    }
    const explicitTenge = /^\s*(?:₸|тенге|тг(?![а-я])|kzt)/u.test(after);
    if (!number.scaled && number.value > 0 && number.value < 1_000 && !explicitTenge) {
      ask(`Уточните единицы для «${number.raw}»: тенге, тысячи или миллионы?`, slot);
      continue;
    }
    if (number.value === 0 && slot !== "maxAdvance") {
      ask("Стоимость и желаемый ежемесячный платеж должны быть больше нуля.", slot);
      continue;
    }
    result[slot] = number.value;
  }

  const changed = ["maxMonthly", "maxAdvance", "price", "months", "clientType"].some((key) =>
    Object.prototype.hasOwnProperty.call(result, key),
  );
  if (negatedSlot)
    ask(
      "Укажите итоговое значение и название поля, например «стоимость 20 млн ₸».",
      negatedSlot === "months" ? undefined : negatedSlot,
    );
  if (unassignedNumber && !changed && clarifications.length === 0) {
    ask(
      "Что означает сумма: ежемесячный платеж, аванс или стоимость автомобиля? Укажите также тенге, тысячи или миллионы.",
    );
  }

  const reduction = reductionAction(text);
  if (
    /объясн|объясни|поясн|почему|как[^,;.!?]{0,25}(?:счит|рассчит)|из\s+чего|формул/u.test(text)
  ) {
    result.action = "explain";
  } else if (reduction) {
    result.action = reduction;
  } else if (
    changed ||
    /рассчита|посчита|пересчита|расчет|подбери|подберите|подобрать/u.test(text)
  ) {
    result.action = "calculate";
  }
  if (clarifications.length) result.clarification = clarifications.join(" ");
  if (unclearMoneySlots.size === 1) result.clarificationSlot = [...unclearMoneySlots][0];
  return result;
}
