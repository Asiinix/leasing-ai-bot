import demoCatalog from "../../../docs/roadmap/leasing-demo-car-catalog.json";
import priceSnapshot from "./price-snapshot.json";
import {
  BRAND_SEGMENT_BASELINES,
  MODEL_PRICE_RULES,
  PRICE_ESTIMATED_AT,
  PRICE_RULES_VERSION,
} from "./price-rules";
import type { LeaseModel } from "../../lib/types";
import type { VehiclePriceKind, VehiclePriceMethod } from "./types";
import { boundDemoPrice } from "./demo-pricing";

export interface VehiclePriceRecord {
  modelId: number;
  partnerId: number;
  brand: string;
  model: string;
  priceKzt: number;
  originalPriceKzt?: number;
  priceKind: VehiclePriceKind;
  priceMethod: VehiclePriceMethod;
  priceBasis: string;
  priceSourceUrl: string | null;
  priceCheckedAt: string | null;
  priceEstimatedAt: string | null;
  trim: string | null;
  modelYear: number | null;
  referenceId: string | null;
  ruleId: string;
}

export function normalizeVehicleName(value: string): string {
  return value.normalize("NFKC").trim().toUpperCase().replace(/\s+/gu, " ");
}

export function normalizeVehicleModel(value: string, brand: string): string {
  const name = normalizeVehicleName(value);
  const prefix = `${normalizeVehicleName(brand)} `;
  return name.startsWith(prefix) ? name.slice(prefix.length) : name;
}

function identity(model: LeaseModel) {
  return {
    modelId: model.id,
    partnerId: model.partnerId,
    brand: model.brand,
    model: model.name,
  };
}

/** Deterministic teaching prices; deliberately do not imply an appraisal or market feed. */
export function estimateVehiclePrice(model: LeaseModel): VehiclePriceRecord {
  const brand = normalizeVehicleName(model.brand);
  const name = normalizeVehicleModel(model.name, model.brand);
  const rules = MODEL_PRICE_RULES[brand] ?? [];
  const ruleIndex = rules.findIndex(([pattern]) => new RegExp(pattern, "iu").test(name));
  const rule = rules[ruleIndex];
  let millions = rule?.[1] ?? BRAND_SEGMENT_BASELINES[brand] ?? 12;
  let family = rule?.[2] ?? "неуточнённая модель";
  // For unknown model names only, use an explicit body/segment keyword if provided.
  if (!rule) {
    if (/TRUCK|PICK.?UP|ПИКАП|ГРУЗ|VAN|ФУРГОН|MINIBUS/u.test(name)) {
      millions *= 1.15;
      family = "коммерческий сегмент";
    } else if (/SUV|CROSSOVER|КРОССОВЕР/u.test(name)) {
      millions *= 1.1;
      family = "кроссовер";
    } else if (/MINI|CITY|COMPACT|КОМПАКТ/u.test(name)) {
      millions *= 0.75;
      family = "компактный сегмент";
    }
  }
  const priceKzt = Math.round((millions * 1_000_000) / 100_000) * 100_000;
  return boundDemoPrice({
    ...identity(model),
    priceKzt,
    priceKind: "estimate",
    priceMethod: rule ? "model-family" : "segment-estimate",
    priceBasis: rule
      ? `Синтетический бюджет для демо: ${family}. Год, комплектация и состояние не заданы; это не оценка рыночной стоимости.`
      : `Синтетический бюджет по сегменту ${brand || "неизвестной марки"}: ${family}. Модель не оценена продавцом; это учебная сумма.`,
    priceSourceUrl: null,
    priceCheckedAt: null,
    priceEstimatedAt: PRICE_ESTIMATED_AT,
    trim: null,
    modelYear: null,
    referenceId: null,
    ruleId: `${PRICE_RULES_VERSION}:${brand}:${rule ? ruleIndex : "segment"}`,
  });
}

/** The six original fixtures require exact seller IDs AND normalized brand/model names. */
export function createVehiclePriceRecord(model: LeaseModel): VehiclePriceRecord {
  const reference = demoCatalog.vehicles.find(
    (vehicle) =>
      vehicle.colvir.modelId === model.id &&
      vehicle.colvir.partnerId === model.partnerId &&
      normalizeVehicleName(vehicle.brand) === normalizeVehicleName(model.brand) &&
      normalizeVehicleModel(vehicle.model, vehicle.brand) ===
        normalizeVehicleModel(model.name, model.brand),
  );
  if (!reference) return estimateVehiclePrice(model);
  return boundDemoPrice({
    ...identity(model),
    priceKzt: reference.priceKzt,
    priceKind: "reference",
    priceMethod: "published-price",
    priceBasis:
      "Сохранённая цена конкретной версии из публичного прайса. Наличие и цена покупки в лизинг не подтверждены.",
    priceSourceUrl: reference.priceSourceUrl,
    priceCheckedAt: reference.priceCheckedAt,
    priceEstimatedAt: null,
    trim: reference.trim,
    modelYear: reference.modelYear,
    referenceId: reference.id,
    ruleId: `reference:${reference.id}`,
  });
}

const frozenPrices = new Map(
  (priceSnapshot.items as VehiclePriceRecord[]).map((record) => [
    `${record.modelId}:${record.partnerId}`,
    record,
  ]),
);

/** A new/renamed API model cannot inherit another record's fixed price or provenance. */
export function getVehiclePrice(model: LeaseModel): VehiclePriceRecord {
  const frozen = frozenPrices.get(`${model.id}:${model.partnerId}`);
  if (
    frozen &&
    normalizeVehicleName(frozen.brand) === normalizeVehicleName(model.brand) &&
    normalizeVehicleModel(frozen.model, frozen.brand) ===
      normalizeVehicleModel(model.name, model.brand)
  )
    return { ...frozen };
  return createVehiclePriceRecord(model);
}
