import type { LeaseModel } from "./types";

const photos: Record<string, string> = {
  "TOYOTA|CAMRY": "toyota-camry",
  "HYUNDAI|TUCSON": "hyundai-tucson",
  "KIA|SPORTAGE": "kia-sportage",
  "CHEVROLET|COBALT": "chevrolet-cobalt",
  "HYUNDAI|ELANTRA": "hyundai-elantra",
  "LADA|GRANTA": "lada-granta",
  "CHANGAN|CS35": "changan-cs35",
  "GEELY|COOLRAY": "geely-coolray",
};

/** Local model illustrations; these are not photos of a particular seller's car. */
export function vehiclePhoto(
  model: Pick<LeaseModel, "brand" | "name">,
): `/vehicles/${string}.webp` | null {
  const brand = model.brand.trim().toUpperCase();
  let name = model.name.trim().toUpperCase();
  if (name.startsWith(`${brand} `)) name = name.slice(brand.length).trim();
  // CS35 Plus is a separate model, not a trim of CS35.
  if (brand === "CHANGAN" && /^CS35\s*PLUS\b/.test(name)) return null;
  const file = photos[`${brand}|${name.split(/\s+/)[0]}`];
  return file ? `/vehicles/${file}.webp` : null;
}
