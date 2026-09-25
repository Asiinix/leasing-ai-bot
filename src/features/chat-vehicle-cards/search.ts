import { findOffers } from "../../lib/finance";
import type { ClientType, Quote, TermsData } from "../../lib/types";
import type { VehicleCatalogItem } from "../fixed-price-catalog/types";
import { fitVehicleToTerms } from "../fixed-price-catalog/demo-pricing";
import { MAX_LIVE_TERM_MODELS, type VehicleTermsBatch } from "./terms-batch";

export interface VehicleSearchBudget {
  maxMonthly: number;
  maxAdvance: number;
  lockedMonths?: number;
  clientType: ClientType;
}

export interface VehicleOffer {
  vehicle: VehicleCatalogItem;
  quote: Quote;
  terms: TermsData;
}

export interface VehicleSearchResult {
  offers: VehicleOffer[];
  /** Unique priced cars considered, including unavailable tariffs. */
  pricedCount: number;
  /** Cars with known terms, whether or not they fit the budget. */
  checkedCount: number;
  unavailableCount: number;
  unpricedCount: number;
  /** Part of checkedCount calculated using explicitly dated offline terms. */
  snapshotCount: number;
  /** Cars deliberately outside the bounded/captured tariff coverage, not API errors. */
  skippedCount: number;
  coverage: "complete" | "partial";
}

export interface VehicleOfferSearch {
  vehicles: VehicleCatalogItem[];
  budget: VehicleSearchBudget;
  loadTerms?: (modelId: number, clientType: ClientType, signal?: AbortSignal) => Promise<TermsData>;
  /** Prefer a single local batch request for large catalogs. */
  loadTermsBatch?: (
    modelIds: number[],
    clientType: ClientType,
    signal?: AbortSignal,
  ) => Promise<VehicleTermsBatch>;
  signal?: AbortSignal;
}

function vehicleKey(vehicle: VehicleCatalogItem): string {
  return JSON.stringify([
    vehicle.modelId,
    vehicle.partnerId,
    vehicle.trim?.normalize("NFKC").trim().toLowerCase() ?? null,
    vehicle.modelYear,
  ]);
}

/** Returns promptly on abort even if a custom loader does not consume the signal. */
async function loadWithAbort<T>(
  signal: AbortSignal | undefined,
  loader: () => Promise<T>,
): Promise<T> {
  signal?.throwIfAborted();
  if (!signal) return loader();
  return new Promise<T>((resolve, reject) => {
    const onAbort = () => reject(signal.reason ?? new DOMException("Aborted", "AbortError"));
    signal.addEventListener("abort", onAbort, { once: true });
    Promise.resolve()
      .then(() => {
        signal.throwIfAborted();
        return loader();
      })
      .then(resolve, reject)
      .finally(() => signal.removeEventListener("abort", onAbort));
  });
}

function exactTerms(terms: TermsData, modelId: number): TermsData | null {
  if (
    !terms ||
    (terms.source !== "live" && terms.source !== "snapshot") ||
    !Number.isFinite(Date.parse(terms.checkedAt)) ||
    !Array.isArray(terms.rates) ||
    !Array.isArray(terms.limits) ||
    terms.limits.length === 0
  )
    return null;
  const rates = terms.rates.filter((rate) => rate?.modelId === modelId);
  return rates.length ? { ...terms, rates } : null;
}

/**
 * Searches actual model-specific tariff rows, with at most three requests in
 * flight and at most twelve per-model requests, or one batch request. Unpriced
 * vehicles never trigger requests. Catalog coverage is explicit in the result.
 * Per car: shortest term, then lowest advance, then payment (findOffers order).
 * Across cars: shortest term, then payment, then advance and stable identity.
 */
export async function searchVehicleOffers(input: VehicleOfferSearch): Promise<VehicleSearchResult> {
  input.signal?.throwIfAborted();
  if (input.budget.clientType !== "IP" && input.budget.clientType !== "TOO") {
    throw new RangeError("Unsupported client type.");
  }
  // Reuse the finance boundary validation even when the catalog has no prices.
  findOffers({ ...input.budget, price: 1, rates: [], limits: [] });
  if (!input.loadTermsBatch && !input.loadTerms)
    throw new TypeError("A tariff loader is required.");

  const unique = [
    ...new Map(input.vehicles.map((vehicle) => [vehicleKey(vehicle), vehicle])).values(),
  ];
  const priced = unique.filter(
    (vehicle) =>
      Number.isSafeInteger(vehicle.modelId) &&
      vehicle.modelId > 0 &&
      vehicle.priceKzt !== null &&
      Number.isFinite(vehicle.priceKzt) &&
      vehicle.priceKzt > 0 &&
      vehicle.priceKzt <= Number.MAX_SAFE_INTEGER / 100,
  );
  const byModel = new Map<number, VehicleCatalogItem[]>();
  for (const vehicle of priced) {
    const group = byModel.get(vehicle.modelId) ?? [];
    group.push(vehicle);
    byModel.set(vehicle.modelId, group);
  }

  const result: VehicleSearchResult = {
    offers: [],
    pricedCount: priced.length,
    checkedCount: 0,
    unavailableCount: 0,
    unpricedCount: unique.length - priced.length,
    snapshotCount: 0,
    skippedCount: 0,
    coverage: "complete",
  };
  // Preserve researched prices first, then try cheaper demo estimates. This is
  // a request order only: eligibility still uses the exact returned finance rows.
  const isReference = (vehicle: VehicleCatalogItem) => vehicle.priceKind === "reference";
  const ordered = [...byModel.entries()].sort(
    (a, b) =>
      Number(b[1].some(isReference)) - Number(a[1].some(isReference)) ||
      Math.min(...a[1].map((vehicle) => vehicle.priceKzt!)) -
        Math.min(...b[1].map((vehicle) => vehicle.priceKzt!)) ||
      a[0] - b[0],
  );
  let batch: VehicleTermsBatch | undefined;
  if (input.loadTermsBatch && ordered.length) {
    batch = await loadWithAbort(input.signal, () =>
      input.loadTermsBatch!(
        ordered.map(([id]) => id),
        input.budget.clientType,
        input.signal,
      ),
    );
    if (!batch || !Array.isArray(batch.attemptedModelIds) || !batch.termsByModel)
      throw new TypeError("Invalid tariff coverage response.");
  }
  const attempted = batch ? new Set(batch.attemptedModelIds) : null;
  const groups = attempted
    ? ordered.filter(([id]) => attempted.has(id))
    : ordered.slice(0, MAX_LIVE_TERM_MODELS);
  result.skippedCount =
    priced.length - groups.reduce((total, [, vehicles]) => total + vehicles.length, 0);
  result.coverage = result.skippedCount > 0 ? "partial" : "complete";
  let next = 0;
  async function worker(): Promise<void> {
    while (next < groups.length) {
      input.signal?.throwIfAborted();
      const [modelId, vehicles] = groups[next++];
      let terms: TermsData | null;
      try {
        terms = exactTerms(
          batch
            ? batch.termsByModel[modelId]
            : await loadWithAbort(input.signal, () =>
                input.loadTerms!(modelId, input.budget.clientType, input.signal),
              ),
          modelId,
        );
      } catch (error) {
        input.signal?.throwIfAborted();
        if (error instanceof Error && error.name === "AbortError") throw error;
        terms = null;
      }
      input.signal?.throwIfAborted();
      if (!terms) {
        result.unavailableCount += vehicles.length;
        continue;
      }
      result.checkedCount += vehicles.length;
      if (terms.source === "snapshot") result.snapshotCount += vehicles.length;
      for (const catalogVehicle of vehicles) {
        const vehicle = fitVehicleToTerms(catalogVehicle, terms);
        const quote = findOffers({
          ...input.budget,
          price: vehicle.priceKzt!,
          rates: terms.rates,
          limits: terms.limits,
        })[0];
        if (quote) result.offers.push({ vehicle, quote, terms });
      }
    }
  }
  await Promise.all(Array.from({ length: Math.min(3, groups.length) }, () => worker()));
  input.signal?.throwIfAborted();
  result.offers.sort(
    (a, b) =>
      a.quote.rate.months - b.quote.rate.months ||
      a.quote.monthlyPayment - b.quote.monthlyPayment ||
      a.quote.advanceAmount - b.quote.advanceAmount ||
      a.vehicle.id.localeCompare(b.vehicle.id),
  );
  return result;
}
