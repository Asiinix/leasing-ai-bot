import { buildSchedule } from "./finance";
import { dateLabel, money, moneyPrecise, percent } from "./format";
import type { ClientType, Quote } from "./types";

export const proposalNote =
  "Предложение носит информационный характер. Окончательные условия определяются после рассмотрения заявки";
export const calculationNote =
  "Предварительный аннуитетный расчет. Страхование, комиссии, особенности НДС и выкупной платеж не включены. Последний платеж корректируется по остатку долга.";
export const scheduleHead = ["Месяц", "Платеж", "Основной долг", "Проценты", "Остаток"];

export function createProposal(
  quote: Quote,
  model: string,
  clientType: ClientType,
  client: string,
  date: Date,
) {
  const day = new Intl.DateTimeFormat("sv-SE", {
    timeZone: "Asia/Almaty",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(date);
  return {
    date: dateLabel(date.toISOString()),
    filename: `Коммерческое_предложение_${day}.pdf`,
    fields: [
      ...(client.trim() ? [["Клиент", client.trim()]] : []),
      ["Предмет лизинга", model],
      ["Тип клиента", clientType === "IP" ? "ИП" : "ТОО"],
      ["Стоимость", money(quote.price)],
      ["Валюта", "KZT (казахстанский тенге)"],
      ["Аванс", `${percent(quote.rate.advancePercent)}% — ${money(quote.advanceAmount)}`],
      ["Срок лизинга", `${quote.rate.months} месяцев`],
      ["Годовая ставка", `${percent(quote.rate.annualRate)}%`],
      ["Сумма финансирования", money(quote.principal)],
      ["Ежемесячный платеж", money(quote.monthlyPayment)],
      ["Проценты за срок", moneyPrecise(quote.totalInterest)],
      ["Сумма платежей", moneyPrecise(quote.totalPayments)],
      ["Выплаты с авансом", moneyPrecise(quote.totalWithAdvance)],
    ],
    schedule: buildSchedule(quote).map((row) => [
      String(row.month),
      moneyPrecise(row.payment),
      moneyPrecise(row.principal),
      moneyPrecise(row.interest),
      moneyPrecise(row.balance),
    ]),
  };
}
export type Proposal = ReturnType<typeof createProposal>;
