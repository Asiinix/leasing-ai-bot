import sources from "./photo-sources.json";
import brandSources from "./brand-photo-sources.json";
import type { VehicleCatalogItem } from "./types";

export type VehiclePhoto = {
  src: string;
  alt: string;
  caption: string;
  sourcePageUrl: string;
  kind: "model" | "brand-illustration";
  credit?: string;
  license?: string;
  licenseUrl?: string;
};
type Source = {
  localPath: string;
  sourcePageUrl: string;
  brand: string;
  model: string;
  credit?: string;
  license?: string;
  licenseUrl?: string;
};
const entries = Object.values(sources) as Source[];
const brandEntries = Object.values(brandSources) as Source[];
const normalize = (value: string) => value.toLocaleLowerCase().replace(/[^\p{L}\p{N}]/gu, "");

export function vehiclePhoto(
  vehicle: Pick<VehicleCatalogItem, "brand" | "model">,
): VehiclePhoto | null {
  const brand = normalize(vehicle.brand);
  const rawModel = normalize(vehicle.model);
  const model = rawModel.startsWith(brand) ? rawModel.slice(brand.length) : rawModel;
  const exact = entries.find(
    (photo) => normalize(photo.brand) === brand && normalize(photo.model) === model,
  );
  const photo =
    exact ??
    brandEntries.find((item) => normalize(item.brand) === brand) ??
    entries.find((item) => normalize(item.brand) === brand);
  if (!photo) return null;
  return {
    src: photo.localPath,
    alt: exact
      ? `${vehicle.brand} ${vehicle.model}`
      : `Автомобиль ${photo.brand} ${photo.model} — иллюстрация марки`,
    caption: exact
      ? "Фото модели · комплектация может отличаться"
      : `Иллюстрация марки ${photo.brand} · на фото ${photo.model}`,
    sourcePageUrl: photo.sourcePageUrl,
    kind: exact ? "model" : "brand-illustration",
    credit: photo.credit,
    license: photo.license,
    licenseUrl: photo.licenseUrl,
  };
}
