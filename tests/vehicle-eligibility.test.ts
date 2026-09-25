import assert from "node:assert/strict";
import test from "node:test";
import { isPriceAllowed } from "../src/lib/finance";
import type { TermsData } from "../src/lib/types";
import {
  modelPriceRange,
  outsidePriceRange,
  programPriceRange,
  selectVehicleRate,
} from "../src/features/fixed-price-catalog/eligibility";

// Matiz rows and limits returned by Colvir on 25.09.2026; no rates are synthesized in the app.
const terms: TermsData = {
  source: "live",
  checkedAt: "2026-09-25T09:11:56.602Z",
  rates: [
    { modelId: 2657, months: 37, advancePercent: 20, annualRate: 23.75, rateId: 14579 },
    { modelId: 2657, months: 37, advancePercent: 25, annualRate: 23.6, rateId: 14580 },
  ],
  limits: [
    { advancePercent: 0, minPrice: 5_000_000, maxPrice: 50_000_000 },
    { advancePercent: 15, minPrice: 5_882_353, maxPrice: 58_823_529 },
    { advancePercent: 20, minPrice: 6_250_000, maxPrice: 62_500_000 },
    { advancePercent: 25, minPrice: 6_666_667, maxPrice: 66_666_666 },
  ],
};
const form = { modelId: 2657, price: 2_500_000, advancePercent: 20, months: 48 };

test("Matiz keeps its 2.5m price; real limits cannot produce a valid quote", () => {
  const before = structuredClone(form);
  const chosen = selectVehicleRate(terms, form)!;
  assert.equal(chosen.advancePercent, 20);
  assert.equal(chosen.months, 37);
  assert.deepEqual(form, before);
  assert.equal(isPriceAllowed(form.price, chosen, terms.limits), false);
  assert.deepEqual(modelPriceRange(2657, terms), { min: 6_250_000, max: 66_666_666 });
});

test("choosing a car picks an actual affordable advance instead of inheriting incompatible settings", () => {
  const expanded = {
    ...terms,
    rates: [
      ...terms.rates,
      { modelId: 2657, months: 48, advancePercent: 15, annualRate: 24, rateId: 3 },
    ],
  };
  const chosen = selectVehicleRate(expanded, { ...form, price: 5_900_000 })!;
  assert.equal(chosen.rateId, 3);
  assert.equal(isPriceAllowed(5_900_000, chosen, terms.limits), true);
});

test("a supported preferred advance is preserved, including the exact minimum price", () => {
  const chosen = selectVehicleRate(terms, { ...form, price: 6_250_000, months: 37 })!;
  assert.equal(chosen.rateId, 14579);
  assert.equal(isPriceAllowed(6_250_000, chosen, terms.limits), true);
  assert.equal(isPriceAllowed(6_249_999, chosen, terms.limits), false);
});

test("a foreign model rate cannot make the chosen car eligible", () => {
  const withForeign = {
    ...terms,
    rates: [
      ...terms.rates,
      { modelId: 999, months: 48, advancePercent: 0, annualRate: 1, rateId: 4 },
    ],
  };
  assert.deepEqual(modelPriceRange(2657, withForeign), modelPriceRange(2657, terms));
  const chosen = selectVehicleRate(withForeign, { ...form, price: 5_100_000, advancePercent: 0 })!;
  assert.equal(chosen.modelId, 2657);
  assert.equal(isPriceAllowed(5_100_000, chosen, terms.limits), false);
});

test("missing model rates or price limits stay unconfirmed instead of inheriting another range", () => {
  assert.equal(modelPriceRange(999, terms), null);
  assert.equal(selectVehicleRate(terms, { ...form, modelId: 999 }), undefined);
  assert.equal(programPriceRange([]), null);
  assert.equal(outsidePriceRange(2_500_000, null), false);
  assert.equal(programPriceRange([{ advancePercent: 20, minPrice: 10, maxPrice: 5 }]), null);
});

test("catalog marks only prices definitely outside the program envelope", () => {
  const range = programPriceRange(terms.limits);
  assert.deepEqual(range, { min: 5_000_000, max: 66_666_666 });
  assert.equal(outsidePriceRange(2_500_000, range), true);
  assert.equal(outsidePriceRange(70_000_000, range), true);
  assert.equal(outsidePriceRange(5_000_000, range), false);
  assert.equal(outsidePriceRange(66_666_666, range), false);
  assert.equal(outsidePriceRange(null, range), false);
  assert.equal(outsidePriceRange(NaN, range), false);
});
