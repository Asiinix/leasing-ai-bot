import assert from "node:assert/strict";
import test from "node:test";
import {
  buildSchedule,
  calculateQuote,
  estimateMaxPrice,
  findOffers,
  isPriceAllowed,
} from "../src/lib/finance";
import type { LeaseRate, PriceLimit } from "../src/lib/types";

const rate48: LeaseRate = {
  modelId: 2875,
  months: 48,
  advancePercent: 20,
  annualRate: 24.15,
  rateId: 2181,
};
const rate60: LeaseRate = { ...rate48, months: 60, annualRate: 24.55, rateId: 2182 };
const limits: PriceLimit[] = [{ advancePercent: 20, minPrice: 1_000_000, maxPrice: 50_000_000 }];
const rates = [rate60, rate48];
const cents = (value: number) => Math.round(value * 100);

test("known API examples: 15 million, 20% advance, 48 and 60 months", () => {
  const first = calculateQuote(15_000_000, rate48);
  const second = calculateQuote(15_000_000, rate60);
  assert.equal(first.advanceAmount, 3_000_000);
  assert.equal(first.principal, 12_000_000);
  assert.equal(first.monthlyPayment, 392_217.8);
  assert.equal(second.monthlyPayment, 349_057.1);
});

test("graph conserves principal and totals exactly in cents and ends at zero", () => {
  for (const rate of rates) {
    const quote = calculateQuote(15_000_000.11, rate);
    const schedule = buildSchedule(quote);
    assert.equal(schedule.length, rate.months);
    assert.equal(schedule.at(-1)?.balance, 0);
    assert.equal(
      schedule.reduce((sum, row) => sum + cents(row.principal), 0),
      cents(quote.principal),
    );
    assert.equal(
      schedule.reduce((sum, row) => sum + cents(row.interest), 0),
      cents(quote.totalInterest),
    );
    assert.equal(
      schedule.reduce((sum, row) => sum + cents(row.payment), 0),
      cents(quote.totalPayments),
    );
    assert.equal(
      cents(quote.totalPayments) + cents(quote.advanceAmount),
      cents(quote.totalWithAdvance),
    );
    assert.equal(cents(quote.advanceAmount) + cents(quote.principal), cents(quote.price));
    let previousBalance = cents(quote.principal);
    for (const row of schedule) {
      assert.equal(cents(row.payment), cents(row.principal) + cents(row.interest));
      assert.equal(previousBalance - cents(row.principal), cents(row.balance));
      assert.ok(row.balance >= 0);
      previousBalance = cents(row.balance);
    }
  }
});

test("zero annual rate and the final rounding residual", () => {
  const quote = calculateQuote(100, { ...rate48, months: 3, advancePercent: 0, annualRate: 0 });
  assert.equal(quote.monthlyPayment, 33.33);
  assert.equal(quote.totalPayments, 100);
  assert.equal(quote.totalInterest, 0);
  assert.deepEqual(
    buildSchedule(quote).map((row) => row.payment),
    [33.33, 33.33, 33.34],
  );
});

test("price bounds are inclusive and apply before advance", () => {
  const cap = [{ advancePercent: 20, minPrice: 10_000_000, maxPrice: 14_000_000 }];
  assert.equal(isPriceAllowed(10_000_000, rate48, cap), true);
  assert.equal(isPriceAllowed(14_000_000, rate48, cap), true);
  assert.equal(isPriceAllowed(9_999_999.99, rate48, cap), false);
  assert.equal(isPriceAllowed(14_000_000.01, rate48, cap), false);
  assert.equal(isPriceAllowed(15_000_000, rate48, cap), false); // principal is only 12m
  assert.equal(isPriceAllowed(12_000_000, rate48, []), false);
  assert.equal(isPriceAllowed(12_000_000, rate48, [{ ...cap[0], advancePercent: 25 }]), false);
});

test("filters monthly and advance budgets without inventing combinations", () => {
  const search = { price: 15_000_000, rates, limits, maxMonthly: 350_000, maxAdvance: 3_000_000 };
  assert.deepEqual(
    findOffers(search).map((q) => q.rate.rateId),
    [2182],
  );
  assert.equal(findOffers({ ...search, maxAdvance: 2_999_999.99 }).length, 0);
  assert.equal(findOffers({ ...search, lockedMonths: 48 }).length, 0);
  assert.equal(findOffers({ ...search, lockedMonths: 36 }).length, 0);
  assert.equal(findOffers({ ...search, rates: [rate48] }).length, 0);
  assert.equal(findOffers({ ...search, limits: [] }).length, 0);
});

test("the monthly budget comparison uses the unrounded formula", () => {
  const r = rate60.annualRate / 1_200;
  const exact = (12_000_000 * r) / -Math.expm1(-rate60.months * Math.log1p(r));
  const input = { price: 15_000_000, rates: [rate60], limits, maxAdvance: 3_000_000 };
  assert.equal(findOffers({ ...input, maxMonthly: exact - 0.000_001 }).length, 0);
  assert.equal(findOffers({ ...input, maxMonthly: exact }).length, 1);
  assert.equal(findOffers({ ...input, maxMonthly: exact + 0.000_001 }).length, 1);
});

test("offers sort by shortest term then smallest advance, preserving API rows", () => {
  const moreAdvance = { ...rate48, advancePercent: 25, rateId: 2184, annualRate: 23.95 };
  const offers = findOffers({
    price: 15_000_000,
    rates: [rate60, moreAdvance, rate48],
    limits: [...limits, { ...limits[0], advancePercent: 25 }],
    maxMonthly: 500_000,
    maxAdvance: 4_000_000,
  });
  assert.deepEqual(
    offers.map((q) => q.rate.rateId),
    [2181, 2184, 2182],
  );
  assert.deepEqual(offers[1].rate, moreAdvance);
});

test("estimateMaxPrice finds a valid cent boundary and respects limits", () => {
  const input = { rates, limits, maxMonthly: 350_000, maxAdvance: 3_000_000 };
  const price = estimateMaxPrice(input);
  assert.ok(price !== null);
  assert.ok(findOffers({ ...input, price }).length > 0);
  assert.equal(findOffers({ ...input, price: (cents(price) + 1) / 100 }).length, 0);
  assert.equal(estimateMaxPrice({ ...input, maxAdvance: 1 }), null);
  assert.equal(estimateMaxPrice({ ...input, limits: [] }), null);
  assert.equal(estimateMaxPrice({ ...input, lockedMonths: 36 }), null);
  const zero = { ...rate48, annualRate: 0, advancePercent: 0, months: 12 };
  assert.equal(
    estimateMaxPrice({
      rates: [zero],
      limits: [{ advancePercent: 0, minPrice: 1, maxPrice: 1_000 }],
      maxMonthly: 10,
      maxAdvance: 0,
    }),
    120,
  );
});

test("rejects invalid numeric inputs and excludes malformed API rows", () => {
  for (const price of [0, -1, NaN, Infinity])
    assert.throws(() => calculateQuote(price, rate48), RangeError);
  for (const patch of [
    { annualRate: NaN },
    { annualRate: -1 },
    { months: 0 },
    { months: 12.5 },
    { advancePercent: 100 },
    { advancePercent: -1 },
    { rateId: 0 },
  ]) {
    assert.throws(() => calculateQuote(15_000_000, { ...rate48, ...patch }), RangeError);
  }
  const input = { price: 15_000_000, rates, limits, maxMonthly: 400_000, maxAdvance: 3_000_000 };
  assert.throws(() => findOffers({ ...input, maxMonthly: NaN }), RangeError);
  assert.throws(() => findOffers({ ...input, maxAdvance: -1 }), RangeError);
  assert.throws(() => findOffers({ ...input, lockedMonths: 2.5 }), RangeError);
  assert.equal(findOffers({ ...input, rates: [{ ...rate48, annualRate: NaN }] }).length, 0);
  assert.equal(isPriceAllowed(NaN, rate48, limits), false);
  const quote = calculateQuote(15_000_000, rate48);
  assert.throws(() => buildSchedule({ ...quote, principal: 1 }), RangeError);
});
