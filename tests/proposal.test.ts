import test from "node:test";
import assert from "node:assert/strict";
import {
  parseProposal,
  proposalCalculation,
  proposalQuery,
  type ProposalSnapshot,
} from "../src/features/proposal/snapshot";

const snapshot: ProposalSnapshot = {
  version: 1,
  createdAt: "2026-09-25T09:00:00.000Z",
  clientType: "IP",
  model: {
    id: 11,
    brand: "Hyundai",
    name: "Tucson",
    partnerId: 1,
    partnerName: "Тестовый поставщик",
  },
  price: 15_000_000,
  rate: { modelId: 11, rateId: 1, months: 48, advancePercent: 20, annualRate: 24.15 },
  termsSource: "snapshot",
  termsCheckedAt: "2026-09-25T08:00:00.000Z",
  priceSource: "example",
  insurance: { enabled: true, category: "passenger" },
};

test("proposal link retains the exact model, price, tariff and insurance selection", () => {
  const original = structuredClone(snapshot);
  const params = new URLSearchParams(proposalQuery(original));
  original.price = 10_000_000;
  original.rate.months = 60;
  original.insurance.enabled = false;
  assert.deepEqual(parseProposal(params.get("data")), snapshot);
});

test("proposal schedule reconciles financing, interest, advance and final balance", () => {
  const { quote, schedule, insurance } = proposalCalculation(snapshot);
  const sum = (key: "payment" | "principal" | "interest") =>
    schedule.reduce((total, row) => total + Math.round(row[key] * 100), 0) / 100;
  assert.equal(schedule.length, 48);
  assert.equal(schedule.at(-1)!.balance, 0);
  assert.equal(sum("principal"), quote.principal);
  assert.equal(sum("interest"), quote.totalInterest);
  assert.equal(
    Math.round((sum("payment") + quote.advanceAmount) * 100),
    Math.round(quote.totalWithAdvance * 100),
  );
  assert.equal(insurance.annual, 330_000);
});

test("CASCO selection and category change only insurance, not lease totals", () => {
  const original = proposalCalculation(snapshot);
  const alternate = proposalCalculation({
    ...snapshot,
    insurance: { enabled: false, category: "truck" },
  });
  assert.deepEqual(alternate.quote, original.quote);
  assert.deepEqual(alternate.schedule, original.schedule);
  assert.equal(alternate.insurance.annual, 97_500);
});

test("invalid or mismatched snapshot is rejected rather than creating a broken proposal", () => {
  for (const raw of [undefined, [JSON.stringify(snapshot)], "", "{", "null", "x".repeat(8001)])
    assert.equal(parseProposal(raw), null);
  for (const change of [
    { price: -1 },
    { price: "15000000" },
    { createdAt: "invalid" },
    { termsCheckedAt: "invalid" },
    { rate: { ...snapshot.rate, modelId: 12 } },
    { rate: { ...snapshot.rate, months: 99999999 } },
    { insurance: { enabled: true, category: "constructor" } },
    { modelYear: "2026" },
  ])
    assert.equal(parseProposal(JSON.stringify({ ...snapshot, ...change })), null);
});

test("computed totals in a link cannot override the original calculation", () => {
  const parsed = parseProposal(
    JSON.stringify({ ...snapshot, monthlyPayment: 1, totalWithAdvance: 1 }),
  );
  assert.ok(parsed);
  assert.equal(
    proposalCalculation(parsed).quote.monthlyPayment,
    proposalCalculation(snapshot).quote.monthlyPayment,
  );
});

test("OSRNS inputs persist in the proposal and calculate separately without changing lease", () => {
  const input = { ...snapshot, osrns: { oked: "62011", annualPayroll: 10_000_000 } };
  const saved = parseProposal(new URLSearchParams(proposalQuery(input)).get("data"));
  assert.ok(saved);
  const proposal = proposalCalculation(saved);
  assert.equal(proposal.osrns!.annualPremium, 85_000);
  assert.deepEqual(proposal.quote, proposalCalculation(snapshot).quote);
  assert.equal(proposal.insurance.annual, 330_000);
  assert.equal(proposalCalculation(snapshot).osrns, null);
  assert.equal(
    parseProposal(
      JSON.stringify({ ...snapshot, osrns: { oked: "missing", annualPayroll: 100_000_000 } }),
    ),
    null,
  );
  assert.equal(parseProposal(JSON.stringify({ ...snapshot, osrns: null })), null);
});
