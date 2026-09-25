import { deflateRawSync, inflateRawSync } from "node:zlib";
import { parseProposal, type ProposalSnapshot } from "./snapshot";

export const PUBLIC_CALCULATOR_URL = "https://leasing-ai-bot-production.up.railway.app/";

/** Server-only, self-contained link: no localStorage, database or external QR service. */
export function encodeResume(snapshot: ProposalSnapshot): string {
  const { model, rate, insurance, osrns } = snapshot;
  const clean: ProposalSnapshot = {
    version: 1,
    createdAt: snapshot.createdAt,
    clientType: snapshot.clientType,
    model: {
      id: model.id,
      brand: model.brand,
      name: model.name,
      partnerId: model.partnerId,
      partnerName: model.partnerName,
    },
    price: snapshot.price,
    rate: {
      modelId: rate.modelId,
      rateId: rate.rateId,
      months: rate.months,
      advancePercent: rate.advancePercent,
      annualRate: rate.annualRate,
    },
    termsSource: snapshot.termsSource,
    termsCheckedAt: snapshot.termsCheckedAt,
    priceSource: snapshot.priceSource,
    ...(snapshot.trim !== undefined ? { trim: snapshot.trim } : {}),
    ...(snapshot.modelYear !== undefined ? { modelYear: snapshot.modelYear } : {}),
    insurance: { enabled: insurance.enabled, category: insurance.category },
    ...(osrns ? { osrns: { oked: osrns.oked, annualPayroll: osrns.annualPayroll } } : {}),
  };
  const json = JSON.stringify(clean);
  if (!parseProposal(json)) throw new Error("Некорректные параметры предложения");
  return `1.${deflateRawSync(Buffer.from(json), { level: 9 }).toString("base64url")}`;
}

export function decodeResume(token: unknown): ProposalSnapshot | null {
  if (typeof token !== "string" || token.length > 6_000 || !/^1\.[A-Za-z0-9_-]+$/.test(token))
    return null;
  try {
    const json = inflateRawSync(Buffer.from(token.slice(2), "base64url"), {
      maxOutputLength: 8_000,
    }).toString("utf8");
    return parseProposal(json);
  } catch {
    return null;
  }
}

export function calculatorResumePath(snapshot: ProposalSnapshot): string {
  return `/?resume=${encodeResume(snapshot)}`;
}

export function publicCalculatorLink(snapshot: ProposalSnapshot): string {
  return new URL(calculatorResumePath(snapshot), PUBLIC_CALCULATOR_URL).href;
}
