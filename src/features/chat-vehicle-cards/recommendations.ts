import type { VehicleOffer } from "./search";

const continuationWords = new Set([
  "еще",
  "другие",
  "других",
  "варианты",
  "вариантов",
  "машины",
  "машин",
  "авто",
  "автомобили",
  "автомобилей",
  "покажи",
  "покажите",
  "показывай",
  "давай",
  "давайте",
  "предложи",
  "предложите",
  "подбери",
  "подберите",
  "хочу",
  "посмотреть",
  "можно",
  "пожалуйста",
  "есть",
  "какие",
]);

/** Only short continuation requests; changed constraints go through the normal parser. */
export function isMoreVehiclesRequest(text: string): boolean {
  const normalized = text
    .normalize("NFKC")
    .toLocaleLowerCase("ru")
    .replaceAll("ё", "е")
    .replace(/[^\p{L}\p{N}]+/gu, " ")
    .trim()
    .replace(/\s+/g, " ");
  // These suffixes explicitly retain the existing budget rather than changing it.
  const request = normalized.replace(
    / (?:под (?:мой|ваш|наш|этот|тот же|такой же) бюджет|в (?:моем|вашем|нашем|том же) бюджете)$/u,
    "",
  );
  const words = request.split(" ");
  return (
    words.length <= 18 &&
    words.some((word) => word === "еще" || word === "другие" || word === "других") &&
    words.every((word) => continuationWords.has(word))
  );
}

export interface VehicleOfferPage {
  offers: VehicleOffer[];
  nextOffset: number;
  hasMore: boolean;
}

/** A stable page of the already ranked result, without mutating or restarting it. */
export function getVehicleOfferPage(
  offers: VehicleOffer[],
  offset: number,
  pageSize = 3,
): VehicleOfferPage {
  const start = Number.isFinite(offset)
    ? Math.min(offers.length, Math.max(0, Math.floor(offset)))
    : 0;
  const size = Number.isFinite(pageSize) && pageSize >= 1 ? Math.floor(pageSize) : 3;
  const page = offers.slice(start, start + size);
  const nextOffset = start + page.length;
  return { offers: page, nextOffset, hasMore: nextOffset < offers.length };
}
