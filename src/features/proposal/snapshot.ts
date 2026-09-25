import { calculateQuote, buildSchedule } from "@/lib/finance";
import type { ClientType, DataSource, LeaseModel, LeaseRate } from "@/lib/types";
import { isVehicleCategory, type VehicleCategory } from "@/features/insurance/categories";
import { calculateInsurance } from "@/features/insurance/calculate";
import { calculateOsrns, type OsrnsInput } from "@/features/osrns/calculate";

export interface ProposalSnapshot {
  version: 1;
  createdAt: string;
  clientType: ClientType;
  model: LeaseModel;
  price: number;
  rate: LeaseRate;
  termsSource: DataSource;
  termsCheckedAt: string;
  priceSource: "manual" | "estimate" | "reference" | "example";
  trim?: string;
  modelYear?: number;
  insurance: { enabled: boolean; category: VehicleCategory };
  osrns?: OsrnsInput;
}

const text = (value: unknown, max = 240): value is string =>
  typeof value === "string" && value.trim().length > 0 && value.length <= max;
const id = (value: unknown): value is number => Number.isSafeInteger(value) && Number(value) > 0;
const date = (value: unknown): value is string =>
  typeof value === "string" && value.length <= 40 && Number.isFinite(Date.parse(value));

/** Only calculation inputs travel with the link; totals are always recalculated. */
export function parseProposal(raw: unknown): ProposalSnapshot | null {
  if (typeof raw !== "string" || raw.length > 8_000) return null;
  try {
    const data = JSON.parse(raw) as ProposalSnapshot;
    if (
      !data ||
      data.version !== 1 ||
      !date(data.createdAt) ||
      !date(data.termsCheckedAt) ||
      !["IP", "TOO"].includes(data.clientType) ||
      !["live", "snapshot"].includes(data.termsSource) ||
      !["manual", "estimate", "reference", "example"].includes(data.priceSource) ||
      !id(data.model?.id) ||
      !id(data.model.partnerId) ||
      !text(data.model.brand) ||
      !text(data.model.name) ||
      !text(data.model.partnerName) ||
      data.rate?.modelId !== data.model.id ||
      typeof data.insurance?.enabled !== "boolean" ||
      !isVehicleCategory(data.insurance.category) ||
      (data.osrns !== undefined && !calculateOsrns(data.osrns)) ||
      (data.trim !== undefined && !text(data.trim)) ||
      (data.modelYear !== undefined &&
        (!Number.isInteger(data.modelYear) || data.modelYear < 1900 || data.modelYear > 2200))
    )
      return null;
    calculateQuote(data.price, data.rate);
    return data;
  } catch {
    return null;
  }
}

export function proposalQuery(snapshot: ProposalSnapshot): string {
  const serialized = JSON.stringify(snapshot);
  if (!parseProposal(serialized)) throw new Error("Невозможно сформировать КП для этого расчёта.");
  return `?data=${encodeURIComponent(serialized)}`;
}

export function proposalCalculation(snapshot: ProposalSnapshot) {
  const quote = calculateQuote(snapshot.price, snapshot.rate);
  return {
    quote,
    schedule: buildSchedule(quote),
    insurance: calculateInsurance(quote.price, snapshot.insurance.category)!,
    osrns: snapshot.osrns ? calculateOsrns(snapshot.osrns) : null,
  };
}
