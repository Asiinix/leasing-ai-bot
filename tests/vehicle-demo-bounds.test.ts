import assert from "node:assert/strict";
import test from "node:test";
import snapshot from "../src/data/colvir-snapshot.json";
import { normalizeCatalog, normalizeLimits } from "../src/lib/colvir";
import { isPriceAllowed } from "../src/lib/finance";
import type { TermsData } from "../src/lib/types";
import { buildVehicleCatalog } from "../src/features/fixed-price-catalog/catalog";
import { fitVehicleToTerms } from "../src/features/fixed-price-catalog/demo-pricing";

const vehicles = buildVehicleCatalog(normalizeCatalog(snapshot.catalog.responses).models);
const matiz = vehicles.find((vehicle) => vehicle.modelId === 2657)!;
const terms: TermsData = {
  source: "live",
  checkedAt: "2026-09-25T00:00:00Z",
  rates: [{ modelId: 2657, months: 37, advancePercent: 25, annualRate: 23.6, rateId: 14580 }],
  limits: [{ advancePercent: 25, minPrice: 6_666_667, maxPrice: 66_666_666 }],
};

test("price fits exact model limits on both sides without mutating the catalog", () => {
  const before = structuredClone(matiz);
  const low = fitVehicleToTerms(matiz, terms);
  assert.equal(low.priceKzt, 6_666_667);
  assert.equal(low.originalPriceKzt, 2_500_000);
  assert.ok(isPriceAllowed(low.priceKzt!, terms.rates[0], terms.limits));
  const high = fitVehicleToTerms({ ...matiz, priceKzt: 90_000_000 }, terms);
  assert.equal(high.priceKzt, 66_666_666);
  assert.deepEqual(matiz, before);
  assert.equal(fitVehicleToTerms(low, terms), low);
});

test("nearest real interval is used rather than a gap or a foreign model's tariff", () => {
  const split = {
    ...terms,
    limits: [
      { advancePercent: 25, minPrice: 1_000_000, maxPrice: 3_000_000 },
      { advancePercent: 25, minPrice: 7_000_000, maxPrice: 9_000_000 },
    ],
  };
  const result = fitVehicleToTerms({ ...matiz, priceKzt: 6_000_000 }, split);
  assert.equal(result.priceKzt, 7_000_000);
  assert.equal(fitVehicleToTerms(matiz, { ...terms, rates: [] }), matiz);
  assert.equal(fitVehicleToTerms(matiz, { ...terms, limits: [] }), matiz);
  assert.equal(
    fitVehicleToTerms(matiz, { ...terms, rates: [{ ...terms.rates[0], modelId: 999 }] }),
    matiz,
  );
  assert.equal(
    fitVehicleToTerms(matiz, {
      ...terms,
      limits: [{ advancePercent: 25, minPrice: 10, maxPrice: 5 }],
    }),
    matiz,
  );
});

test("adjusted published prices become labelled demo prices with no dealer price attribution", () => {
  const reference = vehicles.find((vehicle) => vehicle.priceKind === "reference")!;
  const bounded = fitVehicleToTerms(reference, {
    ...terms,
    rates: [{ ...terms.rates[0], modelId: reference.modelId }],
    limits: [{ advancePercent: 25, minPrice: 20_000_000, maxPrice: 20_000_001 }],
  });
  assert.equal(bounded.priceKzt, 20_000_000);
  assert.equal(bounded.priceKind, "estimate");
  assert.equal(bounded.originalPriceKzt, reference.priceKzt);
  assert.equal(bounded.priceSourceUrl, null);
  assert.equal(bounded.priceCheckedAt, null);
});

test("all 1,036 demo vehicles can fit every captured advance bound for both client types", () => {
  // Synthetic rates below are test fixtures for each available advance, not production tariffs.
  for (const clientType of ["IP", "TOO"] as const) {
    for (const limit of normalizeLimits(snapshot.limits[clientType].response)) {
      for (const vehicle of vehicles) {
        const own = {
          ...terms,
          rates: [
            { ...terms.rates[0], modelId: vehicle.modelId, advancePercent: limit.advancePercent },
          ],
          limits: [limit],
        };
        const adjusted = fitVehicleToTerms(vehicle, own);
        assert.ok(
          isPriceAllowed(adjusted.priceKzt!, own.rates[0], own.limits),
          `${clientType}: ${vehicle.id} / ${limit.advancePercent}`,
        );
      }
    }
  }
});
