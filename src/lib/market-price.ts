/**
 * Ориентировочная цена модели для калькулятора и чата: медиана свежих объявлений
 * kolesa.kz, а если их нет — заготовка стоимости. Один источник, чтобы каталог и
 * помощник подставляли одинаковую цену.
 */
import { pricePreset, type PricePreset } from "./price-presets";
import type { LeaseModel } from "./types";
import { findVehicleMarket, type VehicleMarket } from "./vehicle-market";

export interface MarketPrice {
  price: number;
  /** kolesa — медиана объявлений, preset — заготовка стоимости. */
  source: "kolesa" | "preset";
  presetLevel: PricePreset["level"] | null;
  /** Модельный год цены из объявлений. */
  year: number | null;
  market: VehicleMarket | null;
}

export async function marketPrice(
  model: Pick<LeaseModel, "brand" | "name">,
  fetchImpl?: typeof fetch,
): Promise<MarketPrice> {
  const market = await findVehicleMarket(model, fetchImpl);
  if (market?.price)
    return { price: market.price, source: "kolesa", presetLevel: null, year: market.year, market };
  const preset = pricePreset(model);
  return { price: preset.price, source: "preset", presetLevel: preset.level, year: null, market };
}
