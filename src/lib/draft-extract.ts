/**
 * Deterministic extraction of application fields from a Russian message. Used when the
 * language model is unavailable. Extracts only explicitly stated values; anything unclear
 * becomes a question instead of a guess.
 */
import { findNumbers, normalize, parseMessage } from "./assistant";
import { normalizePhone } from "./draft";
import type { ClientType } from "./types";

export interface ExtractedFields {
  subject?: "car";
  clientType?: ClientType;
  price?: number;
  advancePercent?: number;
  /** Advance given as an amount in KZT; converted to percent only against a known price. */
  advanceAmount?: number;
  months?: number;
  contactPhone?: string;
}

export interface Extraction {
  fields: ExtractedFields;
  questions: string[];
  /** The message mentions a subject this service does not support. */
  unsupportedSubject?: string;
}

const PHONE = /(?:\+?\s*[78])[\s(-]*\d{3}[\s)-]*\d{3}[\s-]*\d{2}[\s-]*\d{2}(?!\d)/u;
const FOREIGN = /^\s*(?:\$|€|₽|usd|eur|rub|доллар[а-я]*|евро|рубл[а-я]*)/u;
const TENGE = /^\s*(?:₸|тенге|тг(?![а-я])|kzt)/u;

export function extractDraftFields(input: string): Extraction {
  const questions: string[] = [];
  const fields: ExtractedFields = {};
  const ask = (q: string) => {
    if (!questions.includes(q)) questions.push(q);
  };

  const phoneMatch = input.match(PHONE);
  let text = normalize(input);
  if (phoneMatch) {
    const phone = normalizePhone(phoneMatch[0]);
    if (phone) fields.contactPhone = phone;
    else ask("Проверьте номер телефона: нужен казахстанский номер, например +7 701 123 45 67.");
    text = normalize(input.replace(phoneMatch[0], " "));
  }

  const unsupported = text.match(
    /спецтехник[а-я]*|грузовик[а-я]*|грузов[а-я]+\s+авто[а-я]*|недвижимост[а-я]*|оборудовани[а-я]*|б\s*\/\s*у|с\s+пробегом/u,
  );
  const unsupportedSubject = unsupported?.[0];
  if (!unsupportedSubject && /автомобил|машин|(?<!\p{L})авто(?!\p{L})|легков/u.test(text))
    fields.subject = "car";

  const intent = parseMessage(input);
  if (intent.clientType) fields.clientType = intent.clientType;
  else if (/ип/u.test(text) && /тоо/u.test(text)) ask("Уточните тип клиента: ИП или ТОО?");

  const spans = findNumbers(text);
  spans.forEach((span, index) => {
    const before =
      text
        .slice(index ? spans[index - 1].end : 0, span.start)
        .split(/[,;.!?\n]/u)
        .at(-1) ?? "";
    const after = text
      .slice(span.end, spans[index + 1]?.start ?? text.length)
      .split(/[,;.!?\n]/u)[0];
    const advanceContext =
      /аванс|взнос/u.test(before) || /^\s*(?:%|процент[а-я]*)?\s*(?:аванс|взнос)/u.test(after);

    if (/^\s*(?:%|процент)/u.test(after)) {
      if (advanceContext) fields.advancePercent = span.value;
      else ask(`К чему относятся ${span.value}%: к авансу?`);
      return;
    }
    const term = after.match(/^\s*(месяц[а-я]*|мес(?![а-я])|год[а-я]*|лет)(?![а-я])/u);
    if (term) {
      if (span.value >= 1900 && /^год/u.test(term[1]) && !/срок|на\s*$/u.test(before)) return;
      const months = span.value * (/^(?:год|лет)/u.test(term[1]) ? 12 : 1);
      if (Number.isInteger(months) && months > 0) fields.months = months;
      else ask("Укажите срок в целых месяцах.");
      return;
    }
    if (FOREIGN.test(after)) {
      ask("Расчет и заявка ведутся в тенге. Укажите сумму в ₸.");
      return;
    }
    if (!span.scaled && span.value < 1_000 && !TENGE.test(after)) {
      ask(`Уточните единицы для «${span.raw}»: тенге, тысячи или миллионы?`);
      return;
    }
    if (advanceContext) {
      fields.advanceAmount = span.value;
      return;
    }
    if (
      /(?<!\p{L})(?:за|стоит|стоимост[а-я]*|цен[а-я]*)\s*$|автомобил|машин|(?<!\p{L})авто/u.test(
        before,
      ) ||
      /^\s*(?:₸|тенге|тг)?\s*(?:стоит|стоимост)/u.test(after)
    ) {
      fields.price = span.value;
      return;
    }
    if (/платеж|в\s+месяц|ежемесячн/u.test(before + after)) return; // budget, handled elsewhere
    ask(`Что означает сумма ${span.raw}: стоимость автомобиля или аванс?`);
  });

  return { fields, questions, unsupportedSubject };
}
