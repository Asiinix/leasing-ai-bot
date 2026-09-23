const moneyFormat = new Intl.NumberFormat("ru-KZ", { maximumFractionDigits: 0 });
export const number = (value: number) => moneyFormat.format(value);
export const money = (value: number) => `${number(value)} ₸`;
export const moneyPrecise = (value: number) =>
  `${new Intl.NumberFormat("ru-KZ", { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(value)} ₸`;
export const percent = (value: number) =>
  new Intl.NumberFormat("ru-KZ", { maximumFractionDigits: 2 }).format(value);
export const dateLabel = (iso: string) =>
  new Intl.DateTimeFormat("ru-RU", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    timeZone: "Asia/Almaty",
  }).format(new Date(iso));
export const readMoney = (text: string) => Number(text.replace(/[^0-9]/g, ""));
