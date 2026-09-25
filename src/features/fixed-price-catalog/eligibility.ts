import { isPriceAllowed } from "../../lib/finance";
import type { LeaseRate, PriceLimit, TermsData } from "../../lib/types";

export interface VehiclePriceRange {
  min: number;
  max: number;
}

/** A broad product boundary, never confirmation of a particular model's tariff. */
export function programPriceRange(limits: PriceLimit[]): VehiclePriceRange | null {
  const valid = limits.filter(
    (limit) =>
      Number.isFinite(limit.advancePercent) &&
      limit.advancePercent >= 0 &&
      limit.advancePercent < 100 &&
      Number.isFinite(limit.minPrice) &&
      limit.minPrice > 0 &&
      Number.isFinite(limit.maxPrice) &&
      limit.maxPrice >= limit.minPrice,
  );
  return valid.length
    ? {
        min: Math.min(...valid.map((limit) => limit.minPrice)),
        max: Math.max(...valid.map((limit) => limit.maxPrice)),
      }
    : null;
}

export function outsidePriceRange(price: number | null, range: VehiclePriceRange | null): boolean {
  return (
    price !== null &&
    Number.isFinite(price) &&
    price > 0 &&
    range !== null &&
    (price < range.min || price > range.max)
  );
}

/** Only limits with a real rate for this model define its supported price range. */
export function modelPriceRange(modelId: number, terms: TermsData): VehiclePriceRange | null {
  return programPriceRange(
    terms.limits.filter((limit) =>
      terms.rates.some(
        (rate) => rate.modelId === modelId && isPriceAllowed(limit.minPrice, rate, [limit]),
      ),
    ),
  );
}

/** Prefer a supported tariff without changing the catalog vehicle's price. */
export function selectVehicleRate(
  terms: TermsData,
  preference: { modelId: number; price: number; advancePercent: number; months: number },
): LeaseRate | undefined {
  const modelRates = terms.rates.filter((rate) => rate.modelId === preference.modelId);
  const supported = modelRates.filter((rate) =>
    isPriceAllowed(preference.price, rate, terms.limits),
  );
  return [...(supported.length ? supported : modelRates)].sort(
    (a, b) =>
      Math.abs(a.advancePercent - preference.advancePercent) -
        Math.abs(b.advancePercent - preference.advancePercent) ||
      Math.abs(a.months - preference.months) - Math.abs(b.months - preference.months) ||
      a.rateId - b.rateId,
  )[0];
}
