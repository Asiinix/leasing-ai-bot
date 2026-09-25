import assert from "node:assert/strict";
import test from "node:test";
import {
  emptyScoringForm,
  formCompletion,
  scoreApplication,
  type ScoringForm,
} from "../src/lib/scoring.ts";

const filled: ScoringForm = {
  taxId: "123456789012",
  businessAge: "gt3",
  monthlyRevenue: 2_000_000,
  monthlyDebt: 0,
  hasDebt: false,
  consent: true,
};

test("completion grows by field and reaches 100 only for a full, valid form", () => {
  assert.equal(formCompletion(emptyScoringForm), 0);
  assert.equal(formCompletion({ ...emptyScoringForm, taxId: "12345" }), 0);
  assert.equal(formCompletion({ ...emptyScoringForm, taxId: "123456789012" }), 20);
  assert.equal(formCompletion({ ...filled, hasDebt: true, monthlyDebt: 0 }), 80);
  assert.equal(formCompletion(filled), 100);
});

test("low debt load, mature business and good advance are approved", () => {
  const result = scoreApplication(filled, {
    clientType: "IP",
    monthlyPayment: 400_000,
    advancePercent: 30,
  });
  assert.equal(result.decision, "approved");
  assert.equal(result.score, 100);
  assert.equal(result.debtLoad, 0.2);
});

test("payments above 70% of revenue are declined regardless of score", () => {
  const result = scoreApplication(
    { ...filled, hasDebt: true, monthlyDebt: 1_200_000 },
    { clientType: "IP", monthlyPayment: 400_000, advancePercent: 50 },
  );
  assert.equal(result.decision, "declined");
});

test("young TOO is declined, young IP goes to review", () => {
  const young = { ...filled, businessAge: "lt1" as const };
  const context = { monthlyPayment: 400_000, advancePercent: 20 };
  assert.equal(scoreApplication(young, { ...context, clientType: "TOO" }).decision, "declined");
  assert.equal(scoreApplication(young, { ...context, clientType: "IP" }).decision, "review");
});
