import assert from "node:assert/strict";
import test from "node:test";
import snapshot from "../src/data/colvir-snapshot.json";
import { getTerms, getVehicleTermsBatch, normalizeCatalog } from "../src/lib/colvir";
import { POST } from "../src/app/api/vehicle-terms/route";
import {
  MAX_LIVE_TERM_MODELS,
  MAX_CATALOG_TERM_MODELS,
} from "../src/features/chat-vehicle-cards/terms-batch";

const ids = normalizeCatalog(snapshot.catalog.responses).models.map((model) => model.id);
const captured = Object.keys(snapshot.rates.IP).map(Number);
const envKeys = [
  "COLVIR_MODE",
  "NEXT_PUBLIC_FEATURE_FIXED_PRICE_CATALOG",
  "NEXT_PUBLIC_FEATURE_CHAT_VEHICLE_CARDS",
];
const original = Object.fromEntries(envKeys.map((key) => [key, process.env[key]]));
test.beforeEach(() => {
  process.env.COLVIR_MODE = "snapshot";
  process.env.NEXT_PUBLIC_FEATURE_FIXED_PRICE_CATALOG = "true";
  process.env.NEXT_PUBLIC_FEATURE_CHAT_VEHICLE_CARDS = "true";
});
test.afterEach(() => {
  for (const key of envKeys) {
    if (original[key] === undefined) delete process.env[key];
    else process.env[key] = original[key];
  }
});

const request = (body: unknown) =>
  new Request("http://localhost/api/vehicle-terms", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

test("the complete snapshot catalog uses zero external requests and only its captured exact matrices", async (t) => {
  let networkCalls = 0;
  t.mock.method(globalThis, "fetch", async () => {
    networkCalls++;
    throw new Error("Unexpected network request");
  });
  const response = await POST(request({ modelIds: ids, clientType: "IP" }));
  assert.equal(response.status, 200);
  assert.equal(response.headers.get("cache-control"), "no-store");
  const batch = await response.json();
  assert.equal(batch.mode, "snapshot");
  assert.equal(batch.requestedModelCount, ids.length);
  assert.deepEqual([...batch.attemptedModelIds].sort(), [...captured].sort());
  assert.deepEqual(Object.keys(batch.termsByModel).sort(), captured.map(String).sort());
  for (const id of captured) {
    assert.ok(batch.termsByModel[id].rates.length);
    assert.ok(
      batch.termsByModel[id].rates.every((rate: { modelId: number }) => rate.modelId === id),
    );
    assert.equal(batch.termsByModel[id].source, "snapshot");
  }
  assert.equal(networkCalls, 0);
});

test("disabled feature returns 404 before reading or loading tariff data", async (t) => {
  t.mock.method(globalThis, "fetch", async () => {
    throw new Error("Must not fetch");
  });
  process.env.NEXT_PUBLIC_FEATURE_CHAT_VEHICLE_CARDS = "false";
  const response = await POST(request({ modelIds: ids, clientType: "IP" }));
  assert.equal(response.status, 404);
});

test("batch endpoint rejects malformed IDs, unknown models, excessive counts and actual body bytes", async () => {
  for (const body of [
    null,
    {},
    { modelIds: ["2637"], clientType: "IP" },
    { modelIds: [-1], clientType: "IP" },
    { modelIds: [2637], clientType: "person" },
    { modelIds: Array(MAX_CATALOG_TERM_MODELS + 1).fill(2637), clientType: "IP" },
  ]) {
    assert.equal((await POST(request(body))).status, 400);
  }
  assert.equal((await POST(request({ modelIds: [999999999], clientType: "IP" }))).status, 404);
  assert.equal(
    (await POST(new Request("http://localhost/api/vehicle-terms", { method: "POST", body: "{" })))
      .status,
    400,
  );
  const oversized = new Request("http://localhost/api/vehicle-terms", {
    method: "POST",
    headers: { "content-length": "1" },
    body: " ".repeat(32_769),
  });
  assert.equal((await POST(oversized)).status, 413);
});

test("live mode makes one bounded model batch plus limits, deduplicates concurrent calls and caches exact rows", async (t) => {
  process.env.COLVIR_MODE = "live";
  const calls: { endpoint: string; body: Record<string, unknown> }[] = [];
  const extras = ids.filter((id) => !captured.includes(id));
  const order = [...extras, ...captured]; // Captured IDs must win despite this caller order.
  t.mock.method(globalThis, "fetch", async (input: string, init: RequestInit = {}) => {
    const endpoint = String(input).split("/").at(-1)!;
    const body = init.body ? JSON.parse(String(init.body)) : {};
    calls.push({ endpoint, body });
    const references: Record<string, unknown> = {
      "z_077_pkg_auto_leasing.p_get_model": snapshot.catalog.responses.models,
      "z_077_pkg_auto_leasing.p_get_brand": snapshot.catalog.responses.brands,
      "z_077_pkg_auto_leasing.p_get_partners": snapshot.catalog.responses.partners,
      "autoLeasing.CarReleaseYears": snapshot.catalog.responses.years,
    };
    if (references[endpoint]) return Response.json(references[endpoint]);
    if (endpoint === "MSB_GetMaxMinSummAutolizing")
      return Response.json(snapshot.limits.IP.response);
    assert.equal(endpoint, "MSBgetAutolizingRateAdvance");
    assert.equal(body.p_cli_type, "IP");
    assert.equal(body.p_id_models.length, MAX_LIVE_TERM_MODELS);
    assert.deepEqual(new Set(body.p_id_models.slice(0, captured.length)), new Set(captured));
    const rows = Object.values(snapshot.rates.IP).flatMap(
      (record) => record.response.data.p_dmnlst,
    );
    return Response.json({
      data: { p_dmnlst: [...rows, { ...rows[0], ID_MODEL: extras[0], ID_RATES_MODEL: 900001 }] },
    });
  });
  const [first, concurrent] = await Promise.all([
    getVehicleTermsBatch(order, "IP"),
    getVehicleTermsBatch(order, "IP"),
  ]);
  assert.deepEqual(first, concurrent);
  assert.equal(first.mode, "live");
  assert.equal(first.attemptedModelIds.length, MAX_LIVE_TERM_MODELS);
  assert.equal(first.requestedModelCount, ids.length);
  assert.equal(calls.filter((call) => call.endpoint === "MSBgetAutolizingRateAdvance").length, 1);
  assert.equal(calls.filter((call) => call.endpoint === "MSB_GetMaxMinSummAutolizing").length, 1);
  assert.ok(first.termsByModel[extras[0]].rates.length);
  assert.ok(first.termsByModel[extras[0]].rates.every((rate) => rate.modelId === extras[0]));
  assert.equal(
    first.termsByModel[extras[1]].rates.length,
    0,
    "A missing row must not borrow a neighbor's rate",
  );
  const count = calls.length;
  assert.deepEqual(await getVehicleTermsBatch(order, "IP"), first);
  assert.deepEqual(await getTerms(extras[0], "IP"), first.termsByModel[extras[0]]);
  assert.equal(calls.length, count, "Batch and single-model requests should share the 60s cache");

  const now = Date.now();
  t.mock.method(Date, "now", () => now + 61_000);
  await getVehicleTermsBatch(order, "IP");
  assert.equal(calls.filter((call) => call.endpoint === "MSBgetAutolizingRateAdvance").length, 2);
});

test("failed live batches only fall back to each exact model's captured matrix", async (t) => {
  process.env.COLVIR_MODE = "live";
  let requests = 0;
  t.mock.method(globalThis, "fetch", async () => {
    requests++;
    throw new Error("upstream unavailable");
  });
  const batch = await getVehicleTermsBatch(ids, "TOO");
  assert.ok(requests <= 6, "At most catalog refresh + two bounded tariff calls, never per car");
  assert.equal(batch.attemptedModelIds.length, MAX_LIVE_TERM_MODELS);
  for (const [id, terms] of Object.entries(batch.termsByModel)) {
    assert.equal(terms.source, "snapshot");
    if (captured.includes(Number(id))) {
      assert.ok(terms.rates.length);
      assert.ok(terms.rates.every((rate) => rate.modelId === Number(id)));
    } else assert.equal(terms.rates.length, 0);
  }
});
