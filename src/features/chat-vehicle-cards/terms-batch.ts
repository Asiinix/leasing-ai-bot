import type { TermsData } from "../../lib/types";

export const MAX_LIVE_TERM_MODELS = 12;
export const MAX_CATALOG_TERM_MODELS = 2_000;

/** Missing IDs were not checked; they must not be described as API errors. */
export interface VehicleTermsBatch {
  termsByModel: Record<string, TermsData>;
  mode: "live" | "snapshot";
  requestedModelCount: number;
  attemptedModelIds: number[];
}
