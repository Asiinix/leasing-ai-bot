import type { LeaseModel } from "../../lib/types";
import type { VehicleCatalogItem } from "./types";
import { getVehiclePrice, normalizeVehicleModel, normalizeVehicleName } from "./pricing";
import { classifyVehicle } from "../insurance/categories";

/** Every API model/seller gets a fixed reference price or an explicitly synthetic demo estimate. */
export function buildVehicleCatalog(models: LeaseModel[]): VehicleCatalogItem[] {
  const seen = new Set<string>();
  return models.flatMap((model): VehicleCatalogItem[] => {
    const key = `${model.id}:${model.partnerId}:${normalizeVehicleName(model.brand)}:${normalizeVehicleModel(model.name, model.brand)}`;
    if (seen.has(key)) return [];
    seen.add(key);
    const price = getVehiclePrice(model);
    const classification = classifyVehicle(model);
    return [
      {
        id: price.referenceId ?? `model-${model.id}-partner-${model.partnerId}`,
        modelId: model.id,
        partnerId: model.partnerId,
        partnerName: model.partnerName,
        brand: model.brand,
        model: model.name,
        category: classification.category,
        categoryNeedsReview: classification.needsReview,
        categoryBasis: classification.basis,
        trim: price.trim,
        modelYear: price.modelYear,
        priceKzt: price.priceKzt,
        ...(price.originalPriceKzt !== undefined && { originalPriceKzt: price.originalPriceKzt }),
        priceKind: price.priceKind,
        priceMethod: price.priceMethod,
        priceBasis: price.priceBasis,
        priceSourceUrl: price.priceSourceUrl,
        priceCheckedAt: price.priceCheckedAt,
        priceEstimatedAt: price.priceEstimatedAt,
      },
    ];
  });
}
