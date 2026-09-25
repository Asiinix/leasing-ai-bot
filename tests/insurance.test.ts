import assert from "node:assert/strict";
import test from "node:test";
import snapshot from "../src/data/colvir-snapshot.json";
import classification from "../docs/insurance/catalog-classification.json";
import { normalizeCatalog } from "../src/lib/colvir";
import { buildVehicleCatalog } from "../src/features/fixed-price-catalog/catalog";
import {
  classifyVehicle,
  VEHICLE_CATEGORIES,
  type VehicleCategory,
} from "../src/features/insurance/categories";
import { calculateInsurance } from "../src/features/insurance/calculate";

test("annual insurance applies the four user rates to full asset price", () => {
  for (const [category, expected] of [
    ["passenger", 220_000],
    ["truck", 65_000],
    ["trailer_special", 44_000],
    ["bus", 130_000],
  ] as const) {
    const premium = calculateInsurance(10_000_000, category)!;
    assert.equal(premium.annual, expected);
    assert.equal(premium.monthlyEquivalent, Math.round((expected / 12) * 100) / 100);
  }
  assert.equal(calculateInsurance(15_000_000, "passenger")!.annual, 330_000);
  assert.equal(calculateInsurance(15_000_000, "passenger")!.monthlyEquivalent, 27_500);
  assert.equal(calculateInsurance(6_250_000, "truck")!.annual, 40_625);
  assert.equal(calculateInsurance(6_250_000, "truck")!.monthlyEquivalent, 3_385.42);
});

test("invalid or missing asset prices cannot yield misleading premiums", () => {
  for (const price of [0, -1, NaN, Infinity, Number.MAX_SAFE_INTEGER])
    assert.equal(calculateInsurance(price, "bus"), null);
  assert.equal(calculateInsurance(10_000_000, "invalid" as VehicleCategory), null);
  assert.equal(calculateInsurance(10_000_000, "toString" as VehicleCategory), null);
});

test("classifies commercial models without confusing SUVs or passenger versions", () => {
  for (const [brand, name, category] of [
    ["HYUNDAI", "TUCSON", "passenger"],
    ["HYUNDAI", "PORTER", "truck"],
    ["TOYOTA", "HILUX", "truck"],
    ["TOYOTA", "HILUX SURF", "passenger"],
    ["CHEVROLET", "DAMAS", "passenger"],
    ["CHEVROLET", "DAMAS VAN", "truck"],
    ["JAC", "N35", "truck"],
    ["JAC", "JS6", "passenger"],
    ["ГАЗ", "A65R33", "bus"],
    ["ГАЗ", "А65R35", "bus"],
    ["ГАЗ", "А31R33", "truck"],
    ["UAZ", "3962", "trailer_special"],
    ["UAZ", "220695", "bus"],
    ["UAZ", "PATRIOT", "passenger"],
    ["NEW", "Semi Trailer", "trailer_special"],
    ["NEW", "Экскаватор", "trailer_special"],
    ["NEW", "Minibus", "bus"],
    ["NEW", "Cargo Van", "truck"],
  ])
    assert.equal(classifyVehicle({ brand, name }).category, category, `${brand} ${name}`);
  assert.deepEqual(
    classifyVehicle({ brand: " hyundai ", name: "Hyundai   Tucson" }),
    classifyVehicle({ brand: "HYUNDAI", name: "TUCSON" }),
  );
});

test("mixed body families and unknown records remain explicitly reviewable", () => {
  for (const [brand, name] of [
    ["HYUNDAI", "H 350"],
    ["JAC", "SUNRAY"],
    ["MERCEDES-BENZ", "SPRINTER"],
    ["Samat", "Super"],
    ["NEW", "Unknown"],
  ])
    assert.equal(classifyVehicle({ brand, name }).needsReview, true);
});

test("every one of the 1,036 catalog entries has a deterministic category and annual rate", () => {
  const models = normalizeCatalog(snapshot.catalog.responses).models;
  const vehicles = buildVehicleCatalog(models);
  assert.equal(vehicles.length, 1036);
  assert.equal(classification.items.length, 1036);
  assert.deepEqual(
    models.map((model) => ({
      modelId: model.id,
      partnerId: model.partnerId,
      brand: model.brand,
      model: model.name,
      ...classifyVehicle(model),
    })),
    classification.items,
  );
  for (const vehicle of vehicles) {
    assert.ok(Object.hasOwn(VEHICLE_CATEGORIES, vehicle.category));
    assert.ok(calculateInsurance(vehicle.priceKzt!, vehicle.category)!.annual > 0);
  }
  assert.equal(
    Object.values(classification.counts).reduce((a, b) => a + b, 0),
    1036,
  );
  for (const category of Object.keys(VEHICLE_CATEGORIES))
    assert.ok(classification.items.some((item) => item.category === category));
});
