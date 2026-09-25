import { isVehicleCategory, VEHICLE_CATEGORIES, type VehicleCategory } from "./categories";

/** User-provided annual premium on full vehicle price, separate from financing. */
export function calculateInsurance(price: number, category: VehicleCategory) {
  if (
    !Number.isFinite(price) ||
    price <= 0 ||
    price > Number.MAX_SAFE_INTEGER / 100 ||
    !isVehicleCategory(category)
  )
    return null;
  const priceCents = BigInt(Math.round(price * 100));
  const annualCents =
    (priceCents * BigInt(VEHICLE_CATEGORIES[category].basisPoints) + 5_000n) / 10_000n;
  const monthCents = (annualCents + 6n) / 12n;
  return {
    annual: Number(annualCents) / 100,
    monthlyEquivalent: Number(monthCents) / 100,
    ratePercent: VEHICLE_CATEGORIES[category].ratePercent,
  };
}
