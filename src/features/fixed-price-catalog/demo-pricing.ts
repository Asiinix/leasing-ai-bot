import { isPriceAllowed } from "../../lib/finance";
import type { TermsData } from "../../lib/types";
import type { VehicleCatalogItem } from "./types";

// Fixed teaching range: the captured 20% advance limits. Actual model limits
// are checked again when terms are loaded; this is not a tariff substitute.
export const DEMO_PRICE_BOUNDS = { min: 6_250_000, max: 62_500_000 } as const;

type PriceFields = Pick<
  VehicleCatalogItem,
  | "priceKzt"
  | "originalPriceKzt"
  | "priceKind"
  | "priceMethod"
  | "priceBasis"
  | "priceSourceUrl"
  | "priceCheckedAt"
  | "priceEstimatedAt"
>;

/** An adjusted fixture must never keep the label or source of a dealer quote. */
export function withDemoPrice<T extends PriceFields>(item: T, priceKzt: number): T {
  if (item.priceKzt === priceKzt || !Number.isFinite(priceKzt) || priceKzt <= 0) return item;
  return {
    ...item,
    originalPriceKzt: item.originalPriceKzt ?? item.priceKzt ?? undefined,
    priceKzt,
    priceKind: "estimate",
    priceMethod: "lease-bounds",
    priceBasis:
      "Синтетическая цена для демо, подобранная под допустимый диапазон лизинга. Не является ценой продавца или оценкой рынка.",
    priceSourceUrl: null,
    priceCheckedAt: null,
    priceEstimatedAt: item.priceEstimatedAt ?? "2026-09-25",
  };
}

export function boundDemoPrice<T extends PriceFields>(item: T): T {
  if (item.priceKzt === null || !Number.isFinite(item.priceKzt) || item.priceKzt <= 0) return item;
  return withDemoPrice(
    item,
    Math.max(DEMO_PRICE_BOUNDS.min, Math.min(DEMO_PRICE_BOUNDS.max, item.priceKzt)),
  );
}

/** Fit to the nearest supported interval, never to a gap between tariffs.
 * No model rates means no confirmation: prices cannot create missing tariffs.
 */
export function fitVehicleToTerms(
  vehicle: VehicleCatalogItem,
  terms: TermsData,
): VehicleCatalogItem {
  const price = vehicle.priceKzt;
  if (price === null || !Number.isFinite(price) || price <= 0) return vehicle;
  const rates = terms.rates.filter((rate) => rate.modelId === vehicle.modelId);
  if (rates.some((rate) => isPriceAllowed(price, rate, terms.limits))) return vehicle;
  const candidates = terms.limits.flatMap((limit) => {
    const candidate = Math.max(
      Math.ceil(limit.minPrice),
      Math.min(Math.floor(limit.maxPrice), price),
    );
    return rates.some((rate) => isPriceAllowed(candidate, rate, [limit])) ? [candidate] : [];
  });
  candidates.sort((a, b) => Math.abs(a - price) - Math.abs(b - price) || a - b);
  return candidates.length ? withDemoPrice(vehicle, candidates[0]) : vehicle;
}
