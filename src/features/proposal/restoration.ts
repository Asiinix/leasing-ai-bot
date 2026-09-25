import type { ProposalSnapshot } from "./snapshot";
import type { ClientType, TermsData } from "@/lib/types";

export function proposalForm(snapshot: ProposalSnapshot) {
  return {
    clientType: snapshot.clientType,
    modelId: snapshot.model.id,
    price: snapshot.price,
    advancePercent: snapshot.rate.advancePercent,
    months: snapshot.rate.months,
    // The saved price must not be replaced by today's catalog demo price.
    catalogPrice: false,
  };
}

export function matchesProposalForm(
  snapshot: ProposalSnapshot,
  form: {
    clientType: ClientType;
    modelId: number;
    price: number;
    advancePercent: number;
    months: number;
  },
) {
  const saved = proposalForm(snapshot);
  return (
    saved.clientType === form.clientType &&
    saved.modelId === form.modelId &&
    saved.price === form.price &&
    saved.advancePercent === form.advancePercent &&
    saved.months === form.months
  );
}

/** Preserve the saved quote; current options remain available for editing. No limits are invented. */
export function restoredTerms(snapshot: ProposalSnapshot, current: TermsData | null): TermsData {
  return {
    rates: [
      snapshot.rate,
      ...(current?.rates ?? []).filter(
        (rate) =>
          rate.modelId === snapshot.model.id &&
          (rate.months !== snapshot.rate.months ||
            rate.advancePercent !== snapshot.rate.advancePercent),
      ),
    ],
    limits: current?.limits ?? [],
    source: "snapshot",
    checkedAt: snapshot.termsCheckedAt,
  };
}
