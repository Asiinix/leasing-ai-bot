import assert from "node:assert/strict";
import test from "node:test";
import snapshot from "../src/data/colvir-snapshot.json";
import { normalizeCatalog, normalizeLimits, normalizeRates } from "../src/lib/colvir";
import type { LeaseRate, TermsData } from "../src/lib/types";
import { buildVehicleCatalog } from "../src/features/fixed-price-catalog/catalog";
import type { VehicleCatalogItem } from "../src/features/fixed-price-catalog/types";
import {
  searchVehicleOffers,
  type VehicleSearchBudget,
} from "../src/features/chat-vehicle-cards/search";

const budget: VehicleSearchBudget = {
  maxMonthly: 300_000,
  maxAdvance: 2_000_000,
  clientType: "IP",
};
const catalog = buildVehicleCatalog(normalizeCatalog(snapshot.catalog.responses).models);
const priced = catalog.filter((vehicle) => vehicle.priceKind === "reference");
const cobalt = priced.find((vehicle) => vehicle.modelId === 2637)!;

function rate(modelId = cobalt.modelId, patch: Partial<LeaseRate> = {}): LeaseRate {
  return { modelId, months: 37, advancePercent: 15, annualRate: 23.85, rateId: 1, ...patch };
}

function terms(modelId = cobalt.modelId, patch: Partial<TermsData> = {}): TermsData {
  return {
    rates: [rate(modelId)],
    limits: [{ advancePercent: 15, minPrice: 1, maxPrice: 50_000_000 }],
    source: "live",
    checkedAt: "2026-09-23T14:13:15.971Z",
    ...patch,
  };
}

async function snapshotTerms(modelId: number, clientType: "IP" | "TOO"): Promise<TermsData> {
  const models = snapshot.rates[clientType];
  const record = models[String(modelId) as keyof typeof models];
  return {
    rates: record ? normalizeRates(record.response, modelId) : [],
    limits: normalizeLimits(snapshot.limits[clientType].response),
    source: "snapshot",
    checkedAt: record?.checkedAt ?? snapshot.catalog.checkedAt,
  };
}

test("300k monthly / 2m advance gives the actual model-specific snapshot plans", async () => {
  const calls: number[] = [];
  const result = await searchVehicleOffers({
    vehicles: priced,
    budget,
    loadTerms: async (modelId, clientType) => {
      calls.push(modelId);
      assert.equal(clientType, "IP");
      return snapshotTerms(modelId, clientType);
    },
  });
  assert.equal(calls.length, 6);
  assert.equal(new Set(calls).size, 6);
  assert.equal(result.pricedCount, 6);
  assert.equal(result.checkedCount, 6);
  assert.equal(result.snapshotCount, 6);
  assert.equal(result.unavailableCount, 0);
  assert.equal(result.unpricedCount, 0);
  assert.deepEqual(
    result.offers.map(({ vehicle, quote }) => [
      vehicle.modelId,
      quote.rate.modelId,
      quote.monthlyPayment,
      quote.advanceAmount,
      quote.rate.months,
    ]),
    [
      [2637, 2637, 211_986.53, 973_500, 37],
      [2769, 2769, 294_960.32, 1_588_500, 48],
    ],
  );
});

test("fixed term is respected and unsupported term creates no invented plan", async () => {
  const fixed = await searchVehicleOffers({
    vehicles: priced,
    budget: { ...budget, lockedMonths: 48 },
    loadTerms: snapshotTerms,
  });
  assert.deepEqual(
    fixed.offers.map(({ vehicle, quote }) => [vehicle.modelId, quote.rate.months]),
    [[2769, 48]],
  );
  const unavailable = await searchVehicleOffers({
    vehicles: priced,
    budget: { ...budget, lockedMonths: 36 },
    loadTerms: snapshotTerms,
  });
  assert.equal(unavailable.offers.length, 0);
  assert.equal(unavailable.checkedCount, 6);
});

test("no prices means no requests; zero advance is valid but is never replaced by a default", async () => {
  const noPrices = await searchVehicleOffers({
    vehicles: [{ ...cobalt, priceKzt: null }],
    budget,
    loadTerms: async () => {
      throw new Error("must not load");
    },
  });
  assert.equal(noPrices.checkedCount, 0);
  assert.equal(noPrices.unpricedCount, 1);
  const zero = await searchVehicleOffers({
    vehicles: priced,
    budget: { ...budget, maxAdvance: 0 },
    loadTerms: snapshotTerms,
  });
  assert.equal(zero.offers.length, 0);
  const supported = await searchVehicleOffers({
    vehicles: [cobalt],
    budget: { ...budget, maxAdvance: 0 },
    loadTerms: async () =>
      terms(cobalt.modelId, {
        rates: [rate(cobalt.modelId, { advancePercent: 0, annualRate: 0 })],
        limits: [{ advancePercent: 0, minPrice: 1, maxPrice: 50_000_000 }],
      }),
  });
  assert.equal(supported.offers[0].quote.advanceAmount, 0);
});

test("failed, missing, mismatched and unavailable tariff sources are counted, never cloned", async () => {
  for (const data of [
    terms(9999),
    terms(cobalt.modelId, { rates: [] }),
    terms(cobalt.modelId, { limits: [] }),
    terms(cobalt.modelId, { source: "unavailable" as TermsData["source"] }),
    terms(cobalt.modelId, { checkedAt: "invalid" }),
    null,
  ]) {
    const result = await searchVehicleOffers({
      vehicles: [cobalt],
      budget,
      loadTerms: async () => data as TermsData,
    });
    assert.equal(result.offers.length, 0);
    assert.equal(result.unavailableCount, 1);
    assert.equal(result.checkedCount, 0);
  }
  const failed = await searchVehicleOffers({
    vehicles: [cobalt],
    budget,
    loadTerms: async () => {
      throw new Error("503");
    },
  });
  assert.equal(failed.unavailableCount, 1);
  const mixed = await searchVehicleOffers({
    vehicles: [cobalt],
    budget,
    loadTerms: async () =>
      terms(cobalt.modelId, {
        rates: [rate(9999, { annualRate: 0, months: 12 }), rate()],
      }),
  });
  assert.equal(mixed.offers[0].quote.rate.modelId, cobalt.modelId);
  assert.equal(mixed.offers[0].terms.rates.length, 1);
});

test("confirmed limits are required for the exact advance, including the gross vehicle price", async () => {
  for (const limits of [[], [{ advancePercent: 20, minPrice: 1, maxPrice: 50_000_000 }]]) {
    const result = await searchVehicleOffers({
      vehicles: [cobalt],
      budget,
      loadTerms: async () => terms(cobalt.modelId, { limits }),
    });
    assert.equal(result.offers.length, 0);
    assert.equal(result.checkedCount, limits.length ? 1 : 0);
  }
});

test("chat cards and quotes share the adjusted demo price when model bounds require it", async () => {
  const result = await searchVehicleOffers({
    vehicles: [{ ...cobalt, priceKzt: 2_500_000 }],
    budget,
    loadTerms: async () =>
      terms(cobalt.modelId, {
        limits: [{ advancePercent: 15, minPrice: 5_882_353, maxPrice: 58_823_529 }],
      }),
  });
  assert.equal(result.offers.length, 1);
  const offer = result.offers[0];
  assert.equal(offer.vehicle.priceKzt, 5_882_353);
  assert.equal(offer.quote.price, offer.vehicle.priceKzt);
  assert.equal(offer.vehicle.priceKind, "estimate");
  assert.equal(offer.vehicle.priceSourceUrl, null);
  assert.ok(offer.quote.monthlyPayment <= budget.maxMonthly);
  assert.ok(offer.quote.advanceAmount <= budget.maxAdvance);
});

test("uses unrounded payment and advance caps through the shared finance search", async () => {
  const fractional: VehicleCatalogItem = { ...cobalt, priceKzt: 100 };
  const loadTerms = async () =>
    terms(cobalt.modelId, {
      rates: [rate(cobalt.modelId, { annualRate: 0, advancePercent: 0, months: 3 })],
      limits: [{ advancePercent: 0, minPrice: 1, maxPrice: 100 }],
    });
  const under = await searchVehicleOffers({
    vehicles: [fractional],
    budget: { ...budget, maxMonthly: 33.33, maxAdvance: 0 },
    loadTerms,
  });
  assert.equal(under.offers.length, 0);
  const enough = await searchVehicleOffers({
    vehicles: [fractional],
    budget: { ...budget, maxMonthly: 100 / 3, maxAdvance: 0 },
    loadTerms,
  });
  assert.equal(enough.offers.length, 1);
});

test("one best quote per model/seller/trim and only one request per model", async () => {
  let calls = 0;
  const otherTrim = { ...cobalt, id: "other-trim", trim: "Another", priceKzt: 6_590_000 };
  const result = await searchVehicleOffers({
    vehicles: [cobalt, { ...cobalt, id: "duplicate" }, otherTrim],
    budget,
    loadTerms: async () => {
      calls++;
      return terms(cobalt.modelId, {
        rates: [rate(cobalt.modelId, { months: 60, rateId: 2 }), rate()],
      });
    },
  });
  assert.equal(calls, 1);
  assert.equal(result.offers.length, 2);
  assert.equal(result.pricedCount, 2);
  assert.ok(result.offers.every(({ quote }) => quote.rate.months === 37));
});

test("no more than three requests run together and out-of-order responses sort deterministically", async () => {
  let active = 0;
  let peak = 0;
  const result = await searchVehicleOffers({
    vehicles: priced,
    budget: { ...budget, maxMonthly: 1_000_000, maxAdvance: 10_000_000 },
    loadTerms: async (modelId) => {
      active++;
      peak = Math.max(peak, active);
      await new Promise((resolve) => setTimeout(resolve, modelId % 3));
      active--;
      return terms(modelId);
    },
  });
  assert.equal(peak, 3);
  assert.equal(active, 0);
  assert.equal(result.offers.length, 6);
  assert.deepEqual(
    result.offers.map(({ vehicle }) => vehicle.priceKzt),
    priced.map((vehicle) => vehicle.priceKzt).sort((a, b) => a! - b!),
  );
});

test("pre-aborted and in-flight searches reject promptly without continuing the queue", async () => {
  const before = new AbortController();
  before.abort();
  let calls = 0;
  await assert.rejects(
    searchVehicleOffers({
      vehicles: priced,
      budget,
      signal: before.signal,
      loadTerms: async () => {
        calls++;
        return terms();
      },
    }),
    { name: "AbortError" },
  );
  assert.equal(calls, 0);

  const controller = new AbortController();
  const running = searchVehicleOffers({
    vehicles: priced,
    budget,
    signal: controller.signal,
    loadTerms: async (_modelId, _clientType, signal) => {
      calls++;
      assert.equal(signal, controller.signal);
      if (calls === 3) queueMicrotask(() => controller.abort());
      return new Promise<TermsData>(() => {}); // Even a loader ignoring abort cannot delay cancellation.
    },
  });
  await assert.rejects(running, { name: "AbortError" });
  assert.equal(calls, 3);
});

test("invalid budgets reject consistently even when the catalog has no prices", async () => {
  for (const patch of [{ maxMonthly: 0 }, { maxAdvance: -1 }, { lockedMonths: 1.5 }]) {
    await assert.rejects(
      searchVehicleOffers({
        vehicles: [],
        budget: { ...budget, ...patch },
        loadTerms: snapshotTerms,
      }),
      RangeError,
    );
  }
});

test("legacy per-model loaders are bounded at twelve for a thousand priced cars", async () => {
  const vehicles = Array.from({ length: 1_036 }, (_, index) => ({
    ...cobalt,
    id: `fixture-${index}`,
    modelId: index + 1,
  }));
  let requests = 0;
  const result = await searchVehicleOffers({
    vehicles,
    budget,
    loadTerms: async (id) => {
      requests++;
      return terms(id);
    },
  });
  assert.equal(requests, 12);
  assert.equal(result.checkedCount, 12);
  assert.equal(result.skippedCount, vehicles.length - 12);
  assert.equal(result.unavailableCount, 0);
  assert.equal(result.coverage, "partial");
});

test("one local batch covers only known models and separates skipped models from failed conditions", async () => {
  const vehicles = Array.from({ length: 1_036 }, (_, index) => ({
    ...cobalt,
    id: `fixture-${index}`,
    modelId: index + 1,
  }));
  let batches = 0;
  const result = await searchVehicleOffers({
    vehicles,
    budget,
    loadTerms: async () => {
      throw new Error("Batch search must not load individual endpoints");
    },
    loadTermsBatch: async (modelIds, clientType) => {
      batches++;
      assert.equal(modelIds.length, vehicles.length);
      assert.equal(clientType, "IP");
      return {
        mode: "snapshot",
        requestedModelCount: modelIds.length,
        attemptedModelIds: [1, 2, 3],
        termsByModel: {
          "1": terms(1, { source: "snapshot" }),
          "2": terms(2, { source: "snapshot" }),
          "3": terms(9999), // A mismatched batch row remains unavailable.
          "4": terms(4), // An unattempted row is ignored.
        },
      };
    },
  });
  assert.equal(batches, 1);
  assert.equal(result.checkedCount, 2);
  assert.equal(result.snapshotCount, 2);
  assert.equal(result.unavailableCount, 1);
  assert.equal(result.skippedCount, vehicles.length - 3);
  assert.equal(result.coverage, "partial");
  assert.deepEqual(
    result.offers.map((offer) => offer.vehicle.modelId),
    [1, 2],
  );
});

test("batch loading can be canceled even if the loader ignores its signal", async () => {
  const controller = new AbortController();
  const pending = searchVehicleOffers({
    vehicles: priced,
    budget,
    signal: controller.signal,
    loadTermsBatch: async (_ids, _client, signal) => {
      assert.equal(signal, controller.signal);
      queueMicrotask(() => controller.abort());
      return new Promise(() => {});
    },
  });
  await assert.rejects(pending, { name: "AbortError" });
});

test("all-priced catalog keeps estimated prices separate from actual snapshot tariff coverage", async () => {
  assert.ok(catalog.every((vehicle) => vehicle.priceKzt !== null && vehicle.priceKzt > 0));
  assert.equal(priced.length, 6);
  const captured = new Set(Object.keys(snapshot.rates.IP).map(Number));
  let batches = 0;
  const result = await searchVehicleOffers({
    vehicles: catalog,
    budget,
    loadTermsBatch: async (modelIds, clientType) => {
      batches++;
      const attemptedModelIds = modelIds.filter((id) => captured.has(id));
      return {
        mode: "snapshot",
        requestedModelCount: modelIds.length,
        attemptedModelIds,
        termsByModel: Object.fromEntries(
          await Promise.all(
            attemptedModelIds.map(async (id) => [id, await snapshotTerms(id, clientType)]),
          ),
        ),
      };
    },
  });
  assert.equal(batches, 1);
  assert.equal(result.pricedCount, catalog.length);
  assert.equal(result.unpricedCount, 0);
  assert.equal(result.checkedCount, captured.size);
  assert.equal(result.snapshotCount, captured.size);
  assert.equal(result.unavailableCount, 0);
  assert.equal(result.skippedCount, catalog.length - captured.size);
  assert.equal(result.coverage, "partial");
  for (const { vehicle, quote, terms } of result.offers) {
    assert.ok(captured.has(vehicle.modelId));
    assert.equal(quote.rate.modelId, vehicle.modelId);
    assert.equal(quote.price, vehicle.priceKzt);
    assert.equal(terms.source, "snapshot");
  }
});
