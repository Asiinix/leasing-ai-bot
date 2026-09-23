import type { LeaseRate, PriceLimit, Quote, ScheduleRow } from "./types";

const MAX_SAFE_MONEY = Number.MAX_SAFE_INTEGER / 100;
// A defensive computation bound, not a product term offered to the customer.
const MAX_SCHEDULE_MONTHS = 1_200;

export interface OfferSearch {
  price: number;
  rates: LeaseRate[];
  limits: PriceLimit[];
  maxMonthly: number;
  maxAdvance: number;
  lockedMonths?: number;
}

export type MaxPriceSearch = Omit<OfferSearch, "price">;

function assertMoney(value: number, name: string, allowZero = false): void {
  if (!Number.isFinite(value) || (allowZero ? value < 0 : value <= 0) || value > MAX_SAFE_MONEY) {
    throw new RangeError(
      `${name} must be a finite ${allowZero ? "nonnegative" : "positive"} amount.`,
    );
  }
}

function cents(value: number): number {
  // Scale the small tolerance with the input to correct floating point ties.
  const result = Math.round((value + Number.EPSILON * Math.abs(value)) * 100);
  if (!Number.isSafeInteger(result))
    throw new RangeError("Amount exceeds safe currency precision.");
  return result;
}

function validRate(rate: LeaseRate): boolean {
  return (
    Number.isSafeInteger(rate?.modelId) &&
    rate.modelId > 0 &&
    Number.isSafeInteger(rate?.rateId) &&
    rate.rateId > 0 &&
    Number.isInteger(rate?.months) &&
    rate.months > 0 &&
    rate.months <= MAX_SCHEDULE_MONTHS &&
    Number.isFinite(rate?.advancePercent) &&
    rate.advancePercent >= 0 &&
    rate.advancePercent < 100 &&
    Number.isFinite(rate?.annualRate) &&
    rate.annualRate >= 0
  );
}

function validLimit(limit: PriceLimit): boolean {
  return (
    Number.isFinite(limit?.advancePercent) &&
    limit.advancePercent >= 0 &&
    limit.advancePercent < 100 &&
    Number.isFinite(limit?.minPrice) &&
    limit.minPrice > 0 &&
    Number.isFinite(limit?.maxPrice) &&
    limit.maxPrice >= limit.minPrice &&
    limit.maxPrice <= MAX_SAFE_MONEY
  );
}

function loanAmounts(price: number, rate: LeaseRate) {
  assertMoney(price, "Price");
  if (!validRate(rate)) throw new RangeError("Invalid lease rate or term.");
  const priceCents = cents(price);
  if (priceCents <= 0) throw new RangeError("Price must be at least one minor currency unit.");
  const advanceCents = Math.round((priceCents * rate.advancePercent) / 100);
  const principalCents = priceCents - advanceCents;
  if (principalCents <= 0) throw new RangeError("Financed amount must be positive.");
  return { priceCents, advanceCents, principalCents };
}

function exactPayment(principalCents: number, rate: LeaseRate): number {
  const r = rate.annualRate / 1_200;
  const coefficient = r === 0 ? 1 / rate.months : r / -Math.expm1(-rate.months * Math.log1p(r));
  const payment = (principalCents / 100) * coefficient;
  assertMoney(payment, "Monthly payment");
  return payment;
}

function scheduleFor(principalCents: number, rate: LeaseRate): ScheduleRow[] {
  const paymentCents = cents(exactPayment(principalCents, rate));
  const monthlyRate = rate.annualRate / 1_200;
  let balanceCents = principalCents;
  const rows: ScheduleRow[] = [];
  for (let month = 1; month <= rate.months; month += 1) {
    const interestCents = Math.round(balanceCents * monthlyRate);
    const principalPaidCents =
      month === rate.months
        ? balanceCents
        : Math.min(balanceCents, Math.max(0, paymentCents - interestCents));
    const actualPaymentCents = principalPaidCents + interestCents;
    if (!Number.isSafeInteger(actualPaymentCents))
      throw new RangeError("Payment exceeds safe currency precision.");
    balanceCents -= principalPaidCents;
    rows.push({
      month,
      payment: actualPaymentCents / 100,
      principal: principalPaidCents / 100,
      interest: interestCents / 100,
      balance: balanceCents / 100,
    });
  }
  return rows;
}

/** Computes an annuity for one actual offered API row; no rates are synthesized. */
export function calculateQuote(price: number, rate: LeaseRate): Quote {
  const amounts = loanAmounts(price, rate);
  const rows = scheduleFor(amounts.principalCents, rate);
  const totalCents = rows.reduce((sum, row) => sum + cents(row.payment), 0);
  if (!Number.isSafeInteger(totalCents + amounts.advanceCents)) {
    throw new RangeError("Total exceeds safe currency precision.");
  }
  return {
    price: amounts.priceCents / 100,
    rate: { ...rate },
    advanceAmount: amounts.advanceCents / 100,
    principal: amounts.principalCents / 100,
    monthlyPayment: cents(exactPayment(amounts.principalCents, rate)) / 100,
    totalInterest: (totalCents - amounts.principalCents) / 100,
    totalPayments: totalCents / 100,
    totalWithAdvance: (totalCents + amounts.advanceCents) / 100,
  };
}

/** Uses rounded interest in cents and settles the residual in the final row. */
export function buildSchedule(quote: Quote): ScheduleRow[] {
  const amounts = loanAmounts(quote.price, quote.rate);
  if (
    !Number.isFinite(quote.principal) ||
    !Number.isFinite(quote.advanceAmount) ||
    cents(quote.principal) !== amounts.principalCents ||
    cents(quote.advanceAmount) !== amounts.advanceCents
  ) {
    throw new RangeError("Quote principal and advance do not match its price and rate.");
  }
  return scheduleFor(amounts.principalCents, quote.rate);
}

/** Limits apply to the asset price before advance, for that exact advance row. */
export function isPriceAllowed(price: number, rate: LeaseRate, limits: PriceLimit[]): boolean {
  if (!Number.isFinite(price) || price <= 0 || price > MAX_SAFE_MONEY || !validRate(rate))
    return false;
  return limits.some(
    (limit) =>
      validLimit(limit) &&
      limit.advancePercent === rate.advancePercent &&
      price >= limit.minPrice &&
      price <= limit.maxPrice,
  );
}

function assertSearch(input: MaxPriceSearch): void {
  assertMoney(input.maxMonthly, "Monthly budget");
  assertMoney(input.maxAdvance, "Advance budget", true);
  if (
    input.lockedMonths !== undefined &&
    (!Number.isInteger(input.lockedMonths) ||
      input.lockedMonths <= 0 ||
      input.lockedMonths > MAX_SCHEDULE_MONTHS)
  ) {
    throw new RangeError("Locked term must be a positive integer number of months.");
  }
}

function fitsBudget(price: number, rate: LeaseRate, input: MaxPriceSearch): boolean {
  const amounts = loanAmounts(price, rate);
  // Do not compare a whole-tenge UI value or a rounded monthly payment here.
  return (
    amounts.advanceCents / 100 <= input.maxAdvance &&
    exactPayment(amounts.principalCents, rate) <= input.maxMonthly
  );
}

export function findOffers(input: OfferSearch): Quote[] {
  assertSearch(input);
  assertMoney(input.price, "Price");
  const offers: Quote[] = [];
  for (const rate of input.rates) {
    if (
      !validRate(rate) ||
      (input.lockedMonths !== undefined && rate.months !== input.lockedMonths)
    )
      continue;
    if (!isPriceAllowed(input.price, rate, input.limits)) continue;
    if (fitsBudget(input.price, rate, input)) offers.push(calculateQuote(input.price, rate));
  }
  return offers.sort(
    (a, b) =>
      a.rate.months - b.rate.months ||
      a.advanceAmount - b.advanceAmount ||
      a.monthlyPayment - b.monthlyPayment ||
      a.rate.rateId - b.rate.rateId,
  );
}

/** Highest cent-denominated asset price supported by at least one actual row. */
export function estimateMaxPrice(input: MaxPriceSearch): number | null {
  assertSearch(input);
  let bestCents: number | null = null;
  for (const rate of input.rates) {
    if (
      !validRate(rate) ||
      (input.lockedMonths !== undefined && rate.months !== input.lockedMonths)
    )
      continue;
    for (const limit of input.limits) {
      if (!validLimit(limit) || limit.advancePercent !== rate.advancePercent) continue;
      let low = Math.ceil(limit.minPrice * 100);
      let high = Math.floor(limit.maxPrice * 100);
      if (!Number.isSafeInteger(low) || !Number.isSafeInteger(high) || low > high) continue;
      if (!fitsBudget(low / 100, rate, input)) continue;
      // All budget constraints are monotone over prices for this fixed API row.
      while (low < high) {
        const mid = low + Math.ceil((high - low) / 2);
        if (fitsBudget(mid / 100, rate, input)) low = mid;
        else high = mid - 1;
      }
      if (bestCents === null || low > bestCents) bestCents = low;
    }
  }
  return bestCents === null ? null : bestCents / 100;
}
