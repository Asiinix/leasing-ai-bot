import tariffData from "./tariffs.json";

export const OSRNS_MINIMUM = 85_000;
export const MAX_ANNUAL_PAYROLL = Number.MAX_SAFE_INTEGER / 100;
export const OSRNS_TARIFFS = tariffData.entries;
export type OsrnsTariff = (typeof OSRNS_TARIFFS)[number];
export interface OsrnsInput {
  oked: string;
  annualPayroll: number;
}
const byCode = new Map(OSRNS_TARIFFS.map((entry) => [entry.code, entry]));

export function findOsrnsTariff(code: unknown): OsrnsTariff | null {
  return typeof code === "string" ? (byCode.get(code) ?? null) : null;
}

/** Workbook rates are decimal fractions: 0.0012 = 0.12%, not 12%. */
export function calculateOsrns(input: OsrnsInput) {
  const tariff = findOsrnsTariff(input?.oked);
  if (
    !tariff ||
    !Number.isFinite(input.annualPayroll) ||
    input.annualPayroll <= 0 ||
    input.annualPayroll > MAX_ANNUAL_PAYROLL
  )
    return null;
  const payrollCents = BigInt(Math.round(input.annualPayroll * 100));
  if (payrollCents <= 0n) return null;
  const premiumCents = (payrollCents * BigInt(tariff.rateBasisPoints) + 5_000n) / 10_000n;
  const calculatedPremium = Number(premiumCents) / 100;
  return {
    tariff,
    annualPayroll: Number(payrollCents) / 100,
    ratePercent: tariff.rateBasisPoints / 100,
    calculatedPremium,
    annualPremium: Math.max(OSRNS_MINIMUM, calculatedPremium),
    minimumApplied: calculatedPremium < OSRNS_MINIMUM,
  };
}
