import test from "node:test";
import assert from "node:assert/strict";
import {
  ColvirInputError,
  getCatalog,
  getTerms,
  normalizeCatalog,
  normalizeLimits,
  normalizeRates,
} from "../src/lib/colvir";
import { GET as getTermsRoute } from "../src/app/api/terms/route";

const nested = (rows: unknown[]) => ({ data: { p_dmnlst: rows } });

test("catalog normalizes identifiers, validates joins and includes explicit passenger cars only", () => {
  const result = normalizeCatalog({
    partners: nested([{ ID: "162", NAME: "Partner" }]),
    brands: nested([{ ID: "323", ID_PARTNER: 162, NAME: "HYUNDAI" }]),
    models: nested([
      { ID: "2059", ID_BRAND: 323, ID_PARTNER: 162, CAR_TYPE: 1, NAME: "TUCSON", PRICE: 1 },
      { ID: 2060, ID_BRAND: 323, ID_PARTNER: 999, CAR_TYPE: 1, NAME: "Conflicting partner" },
      { ID: 2061, ID_BRAND: 323, ID_PARTNER: 162, CAR_TYPE: 2, NAME: "Truck" },
      { ID: 2062, ID_BRAND: 323, ID_PARTNER: 162, CAR_TYPE: null, NAME: "Unknown category" },
    ]),
    years: {
      data: [{ quantity: "2026" }, { quantity: 2025 }, { quantity: 2026 }, { quantity: "bad" }],
    },
  });
  assert.deepEqual(result.models, [
    { id: 2059, name: "TUCSON", brand: "HYUNDAI", partnerId: 162, partnerName: "Partner" },
  ]);
  assert.deepEqual(result.years, [2026, 2025]);
  assert.equal("PRICE" in result.models[0], false);
});

test("ordinary rates reject unsupported programs, other models and ambiguous duplicates", () => {
  const base = {
    ID_MODEL: 2875,
    MONTHS: "48",
    ADVANCE: "20",
    RATE: 24.15,
    SUBS: null,
    ID_RATES_MODEL: 2181,
  };
  const rows = [
    base,
    { ...base },
    { ...base, MONTHS: "36" },
    { ...base, ADVANCE: "40" },
    { ...base, ADVANCE: "50" },
    { ...base, ID_MODEL: 2059 },
    { ...base, SUBS: "UNVERIFIED_PROGRAM", MONTHS: "72" },
    { ...base, MONTHS: "60", ID_RATES_MODEL: 2182 },
    { ...base, MONTHS: "60", RATE: 24.55, ID_RATES_MODEL: 2183 },
    { ...base, ADVANCE: "25", ID_RATES_MODEL: 2190 },
    { ...base, ADVANCE: "25", ID_RATES_MODEL: 2191 },
  ];
  assert.deepEqual(normalizeRates(nested(rows), 2875), [
    { modelId: 2875, months: 48, advancePercent: 20, annualRate: 24.15, rateId: 2181 },
  ]);
  assert.throws(() => normalizeRates({ data: [] }, 2875), /format/);
});

test("gross price limits are preserved and malformed or conflicting rows are excluded", () => {
  const result = normalizeLimits({
    data: [
      { name: "20%", min_sum: "6250000", max_sum: "62500000" },
      { name: "25%", min_sum: 6666667, max_sum: 66666666 },
      { name: "25%", min_sum: 7000000, max_sum: 66666666 },
      { name: "30junk", min_sum: 7142858, max_sum: 71428571 },
      { name: "35%", min_sum: 9000000, max_sum: 8000000 },
    ],
  });
  assert.deepEqual(result, [{ advancePercent: 20, minPrice: 6250000, maxPrice: 62500000 }]);
});

test("offline snapshots preserve exact model/client matrices and do not invent missing tariffs", async () => {
  const previous = process.env.COLVIR_MODE;
  process.env.COLVIR_MODE = "snapshot";
  try {
    const catalog = await getCatalog();
    assert.equal(catalog.source, "snapshot");
    assert.ok(catalog.models.some((model) => model.id === 2875));
    assert.deepEqual(catalog.years, [2026, 2025, 2024]);

    const tucson = await getTerms(2875, "IP");
    assert.equal(tucson.source, "snapshot");
    assert.equal(tucson.rates.length, 11);
    assert.equal(
      tucson.rates.find((row) => row.months === 60 && row.advancePercent === 20)?.annualRate,
      24.55,
    );

    const cobalt = await getTerms(2637, "IP");
    assert.equal(cobalt.rates.length, 3);
    assert.ok(cobalt.rates.every((row) => row.months === 37));
    assert.deepEqual(
      cobalt.rates.map((row) => row.advancePercent),
      [15, 20, 25],
    );
    assert.equal(
      (await getTerms(2637, "TOO")).rates.find((row) => row.advancePercent === 20)?.annualRate,
      23.5,
    );
    assert.ok(Date.parse(cobalt.checkedAt) <= Date.parse("2026-09-23T08:51:03Z"));

    const savedIds = new Set([2875, 2769, 2059, 2488, 2715, 2717, 2637]);
    const uncapturedModel = catalog.models.find((model) => !savedIds.has(model.id));
    assert.ok(uncapturedModel);
    assert.deepEqual((await getTerms(uncapturedModel.id, "IP")).rates, []);
    await assert.rejects(
      () => getTerms(999999999, "IP"),
      (error) => error instanceof ColvirInputError && error.status === 404,
    );
  } finally {
    if (previous === undefined) delete process.env.COLVIR_MODE;
    else process.env.COLVIR_MODE = previous;
  }
});

test("terms route validates enum, positive integer and catalog membership", async () => {
  const previous = process.env.COLVIR_MODE;
  process.env.COLVIR_MODE = "snapshot";
  try {
    for (const query of [
      "modelId=2875&clientType=UNKNOWN",
      "modelId=0&clientType=IP",
      "modelId=-1&clientType=IP",
      "modelId=1.5&clientType=IP",
      "modelId=2875",
      "modelId=2875&modelId=2059&clientType=IP",
    ]) {
      const response = await getTermsRoute(new Request(`http://localhost/api/terms?${query}`));
      assert.equal(response.status, 400);
      assert.equal(response.headers.get("Cache-Control"), "no-store");
    }
    assert.equal(
      (
        await getTermsRoute(
          new Request("http://localhost/api/terms?modelId=999999999&clientType=IP"),
        )
      ).status,
      404,
    );
    const valid = await getTermsRoute(
      new Request("http://localhost/api/terms?modelId=2875&clientType=IP"),
    );
    assert.equal(valid.status, 200);
    assert.equal((await valid.json()).rates.length, 11);
  } finally {
    if (previous === undefined) delete process.env.COLVIR_MODE;
    else process.env.COLVIR_MODE = previous;
  }
});

test("network failures return explicitly dated snapshots and never mislabeled live data", async () => {
  const previousMode = process.env.COLVIR_MODE;
  const previousFetch = globalThis.fetch;
  process.env.COLVIR_MODE = "live";
  globalThis.fetch = async (input, init) => {
    assert.ok(
      String(input).startsWith("https://business.bcc.kz/v1/dbp/bcc-online-leasing/api/v1/colvir/"),
    );
    assert.equal(init?.credentials, "omit");
    assert.equal(new Headers(init?.headers).has("Authorization"), false);
    throw new Error("Simulated outage");
  };
  try {
    const catalog = await getCatalog();
    assert.equal(catalog.source, "snapshot");
    assert.ok(catalog.checkedAt.startsWith("2026-09-23T08:51:"));
    const terms = await getTerms(2875, "IP");
    assert.equal(terms.source, "snapshot");
    assert.ok(terms.checkedAt.startsWith("2026-09-23T08:51:"));
    assert.equal(terms.rates.length, 11);
  } finally {
    globalThis.fetch = previousFetch;
    if (previousMode === undefined) delete process.env.COLVIR_MODE;
    else process.env.COLVIR_MODE = previousMode;
  }
});
