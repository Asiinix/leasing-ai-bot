import test from "node:test";
import assert from "node:assert/strict";
import { calculateOsrns, findOsrnsTariff, OSRNS_TARIFFS } from "../src/features/osrns/calculate";
import data from "../src/features/osrns/tariffs.json";

test("all workbook codes and 22 risk classes are preserved, duplicate 28299 is merged", () => {
  assert.equal(OSRNS_TARIFFS.length, 1104);
  assert.equal(new Set(OSRNS_TARIFFS.map((x) => x.code)).size, 1104);
  assert.equal(new Set(OSRNS_TARIFFS.map((x) => x.riskClass)).size, 22);
  assert.equal(
    OSRNS_TARIFFS.reduce((sum, x) => sum + x.sourceRows.length, 0),
    1105,
  );
  assert.equal(data.source.crossCheckedSheet, "ОТБОР NEW");
  assert.deepEqual(findOsrnsTariff("28299")!.sourceRows, [921, 932]);
  assert.ok(
    OSRNS_TARIFFS.every(
      (x) => /^\d{5}$/.test(x.code) && Number.isInteger(x.rateBasisPoints) && x.rateBasisPoints > 0,
    ),
  );
});

test("Excel's 0.0012 means 0.12% and minimum is applied only below 85,000", () => {
  const low = calculateOsrns({ oked: "62011", annualPayroll: 10_000_000 })!;
  assert.equal(low.ratePercent, 0.12);
  assert.equal(low.calculatedPremium, 12_000);
  assert.equal(low.annualPremium, 85_000);
  assert.equal(low.minimumApplied, true);
  const high = calculateOsrns({ oked: "62011", annualPayroll: 100_000_000 })!;
  assert.equal(high.annualPremium, 120_000);
  assert.equal(high.minimumApplied, false);
});

test("high-risk code with a leading zero uses the exact workbook tariff", () => {
  const result = calculateOsrns({ oked: "07101", annualPayroll: 10_000_000 })!;
  assert.equal(result.tariff.riskClass, 22);
  assert.equal(result.ratePercent, 2.96);
  assert.equal(result.annualPremium, 296_000);
  assert.equal(findOsrnsTariff("7101"), null);
});

test("boundary of minimum and amounts above it retain currency precision", () => {
  const entry = OSRNS_TARIFFS.find((x) => x.rateBasisPoints === 75)!;
  const threshold = 85_000 / 0.0075;
  assert.equal(
    calculateOsrns({ oked: entry.code, annualPayroll: threshold })!.annualPremium,
    85_000,
  );
  assert.equal(
    calculateOsrns({ oked: entry.code, annualPayroll: threshold })!.minimumApplied,
    false,
  );
  assert.equal(
    calculateOsrns({ oked: entry.code, annualPayroll: 20_000_001 })!.annualPremium,
    150_000.01,
  );
});

test("empty, unknown, negative and nonfinite inputs do not produce a minimum quote", () => {
  for (const annualPayroll of [0, -1, NaN, Infinity, Number.MAX_SAFE_INTEGER])
    assert.equal(calculateOsrns({ oked: "62011", annualPayroll }), null);
  for (const oked of ["", "99999", "constructor", "toString"])
    assert.equal(calculateOsrns({ oked, annualPayroll: 100_000_000 }), null);
});
