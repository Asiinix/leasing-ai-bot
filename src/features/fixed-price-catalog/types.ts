import type { VehicleCategory } from "../insurance/categories";

export type VehiclePriceKind = "reference" | "estimate";
export type VehiclePriceMethod =
  "published-price" | "model-anchor" | "model-family" | "segment-estimate" | "lease-bounds";

/** Fixed teaching fixtures; estimates are synthetic, not current dealer valuations. */
export interface VehicleCatalogItem {
  id: string;
  modelId: number;
  partnerId: number;
  partnerName: string;
  brand: string;
  model: string;
  category: VehicleCategory;
  categoryNeedsReview: boolean;
  categoryBasis: string;
  trim: string | null;
  modelYear: number | null;
  priceKzt: number | null;
  originalPriceKzt?: number;
  priceKind: VehiclePriceKind;
  priceMethod: VehiclePriceMethod;
  priceBasis: string;
  priceSourceUrl: string | null;
  priceCheckedAt: string | null;
  priceEstimatedAt: string | null;
}
