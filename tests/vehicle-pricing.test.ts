import assert from "node:assert/strict";
import test from "node:test";
import snapshot from "../src/data/colvir-snapshot.json";
import references from "../docs/roadmap/leasing-demo-car-catalog.json";
import frozenPrices from "../src/features/fixed-price-catalog/price-snapshot.json";
import { normalizeCatalog } from "../src/lib/colvir";
import type { LeaseModel } from "../src/lib/types";
import { buildVehicleCatalog } from "../src/features/fixed-price-catalog/catalog";
import { DEMO_PRICE_BOUNDS } from "../src/features/fixed-price-catalog/demo-pricing";
import {
  createVehiclePriceRecord,
  estimateVehiclePrice,
  getVehiclePrice,
} from "../src/features/fixed-price-catalog/pricing";

const models = normalizeCatalog(snapshot.catalog.responses).models;
const catalog = buildVehicleCatalog(models);
const model = (brand: string, name: string, id = 999_999): LeaseModel => ({
  id,
  name,
  brand,
  partnerId: 164,
  partnerName: "Test partner",
});

test("all 1,036 model/seller records have explicit fixed prices and honest provenance", () => {
  assert.equal(models.length, 1036);
  assert.equal(catalog.length, 1036);
  assert.equal(frozenPrices.items.length, 1036);
  assert.equal(new Set(frozenPrices.items.map((x) => `${x.modelId}:${x.partnerId}`)).size, 1036);
  assert.equal(catalog.filter((x) => x.priceKind === "reference").length, 6);
  const estimates = catalog.filter((x) => x.priceKind === "estimate");
  assert.equal(estimates.length, 1030);
  assert.ok(catalog.every((x) => Number.isSafeInteger(x.priceKzt) && x.priceKzt! > 0));
  for (const item of estimates) {
    assert.equal(item.priceSourceUrl, null);
    assert.equal(item.priceCheckedAt, null);
    assert.equal(item.trim, null);
    assert.equal(item.modelYear, null);
    assert.equal(item.priceEstimatedAt, "2026-09-25");
    assert.match(item.priceBasis, /Синтетическ(?:ий|ая)/);
    assert.ok(["model-family", "segment-estimate", "lease-bounds"].includes(item.priceMethod));
  }
});

test("every catalog price and future low/high fixture fits the teaching bounds", () => {
  for (const item of catalog) {
    assert.ok(item.priceKzt! >= DEMO_PRICE_BOUNDS.min, `${item.brand} ${item.model}: below min`);
    assert.ok(item.priceKzt! <= DEMO_PRICE_BOUNDS.max, `${item.brand} ${item.model}: above max`);
  }
  const matiz = getVehiclePrice(models.find((item) => item.id === 2657)!);
  assert.equal(matiz.priceKzt, 6_250_000);
  assert.equal(matiz.originalPriceKzt, 2_500_000);
  assert.equal(matiz.priceMethod, "lease-bounds");
  assert.equal(estimateVehiclePrice(model("AUDI", "R8")).priceKzt, 62_500_000);
});

test("six researched fixtures retain exact price, trim, year and source, not seller transfers", () => {
  for (const ref of references.vehicles) {
    const actual = catalog.find(
      (x) => x.modelId === ref.colvir.modelId && x.partnerId === ref.colvir.partnerId,
    )!;
    assert.equal(actual.priceKind, "reference");
    assert.equal(actual.priceMethod, "published-price");
    assert.equal(actual.priceKzt, ref.priceKzt);
    assert.equal(actual.trim, ref.trim);
    assert.equal(actual.modelYear, ref.modelYear);
    assert.equal(actual.priceSourceUrl, ref.priceSourceUrl);
    assert.equal(actual.priceCheckedAt, ref.priceCheckedAt);
    assert.equal(actual.priceEstimatedAt, null);
  }
  const cobalt = models.find((x) => x.id === 2637)!;
  for (const changed of [
    { ...cobalt, id: 999_999 },
    { ...cobalt, partnerId: 999 },
    { ...cobalt, brand: "KIA" },
    { ...cobalt, name: "Onix" },
    { ...cobalt, name: "Cobalt Plus" },
  ]) {
    const price = getVehiclePrice(changed);
    assert.equal(price.priceKind, "estimate");
    assert.equal(price.priceSourceUrl, null);
    assert.equal(price.referenceId, null);
  }
});

test("normalized names keep fixture identity, and input ordering does not change estimates", () => {
  const cobalt = models.find((x) => x.id === 2637)!;
  assert.equal(
    getVehiclePrice({ ...cobalt, brand: " Chevrolet ", name: "Chevrolet   COBALT" }).priceKind,
    "reference",
  );
  const first = buildVehicleCatalog(models.slice(0, 25));
  const reversed = buildVehicleCatalog(models.slice(0, 25).reverse()).reverse();
  assert.deepEqual(first, reversed);
  assert.equal(buildVehicleCatalog([cobalt, { ...cobalt, name: "Chevrolet COBALT" }]).length, 1);
});

test("families distinguish inexpensive, mainstream and large vehicles within the same marque", () => {
  const price = (brand: string, name: string) => estimateVehiclePrice(model(brand, name)).priceKzt;
  assert.ok(price("TOYOTA", "PASSO") < price("TOYOTA", "CAMRY"));
  assert.ok(price("TOYOTA", "CAMRY") < price("TOYOTA", "LC300"));
  assert.ok(price("HYUNDAI", "GETZ") < price("HYUNDAI", "TUCSON"));
  assert.ok(price("HYUNDAI", "TUCSON") < price("HYUNDAI", "PALISADE"));
  assert.ok(price("BMW", "X1") < price("BMW", "X5"));
  assert.ok(price("BMW", "X5") < price("BMW", "X7"));
  assert.ok(price("KIA", "PICANTO") < price("KIA", "SPORTAGE"));
  assert.ok(price("KIA", "SPORTAGE") < price("KIA", "EV9"));
  assert.ok(new Set(catalog.map((x) => x.priceKzt)).size >= 50);
});

test("unknown models and brands receive deterministic labelled teaching budgets without fake sources", () => {
  for (const candidate of [
    model("NEW BRAND", "Unseen Model"),
    model("HYUNDAI", "Unseen Model"),
    model("", ""),
  ]) {
    const first = getVehiclePrice(candidate);
    const again = getVehiclePrice({ ...candidate, id: candidate.id + 1, partnerId: 555 });
    assert.equal(first.priceKzt, again.priceKzt);
    assert.equal(first.priceKind, "estimate");
    assert.equal(first.priceMethod, "segment-estimate");
    assert.equal(first.priceSourceUrl, null);
    assert.equal(first.priceCheckedAt, null);
    assert.ok(first.priceKzt > 0);
  }
  const compact = estimateVehiclePrice(model("NEW BRAND", "Compact demo"));
  const truck = estimateVehiclePrice(model("NEW BRAND", "Truck demo"));
  assert.ok(compact.priceKzt < truck.priceKzt);
});

test("the committed fixed-price table can be regenerated exactly from the documented rules", () => {
  assert.deepEqual(models.map(createVehiclePriceRecord), frozenPrices.items);
});
