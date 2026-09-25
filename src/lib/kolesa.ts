import type { LeaseModel } from "./types";

export interface VehiclePhoto {
  imageUrl: string | null;
  sourceUrl: string | null;
  caption?: string;
  price?: number;
  listingTitle?: string;
}

const normalize = (value: string) => value.toLowerCase().replace(/[^\p{L}\d]/gu, "");
const aliases: Record<string, string> = {
  газ: "gaz",
  lada: "vaz",
  uaz: "uaz",
  "land rover": "land-rover",
  "great wall": "great-wall",
};

// Kolesa groups commercial variants by family, rather than the bank's chassis index.
// Sources: /cars/gaz/sobol and /cars/gaz/3302-gazel.
function gazFamily(model: Pick<LeaseModel, "brand" | "name">) {
  if (normalize(model.brand) !== "газ") return null;
  const name = model.name.trim();
  if (/^(2310|2752)/.test(name)) return { slug: "sobol", name: "Соболь" };
  if (/^(2705|3302|3221)/.test(name)) return { slug: "3302-gazel", name: "ГАЗель" };
  return null;
}

export function kolesaModelUrl(model: Pick<LeaseModel, "brand" | "name">): string | null {
  const brand = model.brand.toLowerCase().trim();
  const slug = aliases[brand] ?? brand.replace(/\s+/g, "-");
  let name = model.name.toLowerCase().trim();
  if (name.startsWith(`${brand} `)) name = name.slice(brand.length).trim();
  name = gazFamily(model)?.slug ?? name.replace(/\s+/g, "-");
  // Unknown/Cyrillic catalogue names stay selectable without an invented photo.
  if (!/^[a-z0-9-]+$/.test(slug) || !/^[a-z0-9-]+$/.test(name)) return null;
  return `https://kolesa.kz/cars/${slug}/${name}/`;
}

/** Only accept a photo whose caption identifies the requested brand AND model. */
export function parseKolesaPhoto(
  html: string,
  model: Pick<LeaseModel, "brand" | "name">,
): string | null {
  const family = gazFamily(model);
  const modelName = family?.name ?? model.name;
  const name = normalize(modelName);
  const brand = normalize(model.brand);
  const includesBrand = modelName.toLowerCase().startsWith(`${model.brand.toLowerCase()} `);
  const expected = includesBrand ? name : brand + name;
  for (const match of html.matchAll(/<img\b[^>]*>/gi)) {
    const tag = match[0];
    const alt = tag.match(/\balt="([^"]*)"/i)?.[1] ?? "";
    const caption = alt.split(/\s+\d{4}\s+(?:года|г\.)/)[0];
    const actual = normalize(caption);
    if (actual !== expected && !(family && new RegExp(`^${expected}\\d`).test(actual))) continue;
    const src = tag.match(/\bsrc="([^"]*)"/i)?.[1];
    if (!src) continue;
    try {
      const url = new URL(src);
      if (url.protocol === "https:" && url.hostname === "kolesa-photos.kcdn.online") {
        return url.href;
      }
    } catch {
      /* Ignore malformed upstream images. */
    }
  }
  return null;
}

/** Photo and price must come from the same listing, never from a VIP banner or average price. */
export function parseKolesaListing(
  html: string,
  model: Pick<LeaseModel, "brand" | "name">,
): VehiclePhoto {
  const family = gazFamily(model);
  const modelName = model.name.toLowerCase().startsWith(`${model.brand.toLowerCase()} `)
    ? model.name.slice(model.brand.length).trim()
    : model.name;
  const expectedModel = normalize(family?.name ?? modelName);
  let familyExample: VehiclePhoto | undefined;
  for (const match of html.matchAll(/listing\.items\.push\((\{[^\n]+?\})\);/g)) {
    try {
      const item = JSON.parse(match[1]);
      if (
        normalize(String(item.attributes?.brand ?? "")) !== normalize(model.brand) ||
        normalize(String(item.attributes?.model ?? "")) !== expectedModel
      )
        continue;
      if (!Number.isSafeInteger(item.id) || typeof item.name !== "string") continue;
      const sourceUrl = `https://kolesa.kz/a/show/${item.id}`;
      if (item.url !== sourceUrl) continue;
      const start = html.lastIndexOf(`id="advert-${item.id}"`, match.index);
      if (start < 0) continue;
      const imageUrl = parseKolesaPhoto(html.slice(start, match.index), model);
      if (!imageUrl) continue;
      const exactVariant = !family || item.name.split(/\s+/).includes(model.name);
      const price =
        Number.isSafeInteger(item.unitPrice) && item.unitPrice > 0 && item.unitPrice <= 999_999_999
          ? item.unitPrice
          : undefined;
      const result: VehiclePhoto = {
        imageUrl,
        sourceUrl,
        listingTitle: item.name,
        ...(exactVariant && price ? { price } : {}),
        ...(!exactVariant
          ? { caption: `ГАЗ ${family!.name} — пример семейства; цена модификации не найдена` }
          : {}),
      };
      if (exactVariant && price) return result;
      familyExample ??= result;
    } catch {
      /* Skip malformed upstream records. */
    }
  }
  return familyExample ?? { imageUrl: null, sourceUrl: null };
}

export async function getVehiclePhoto(model: LeaseModel): Promise<VehiclePhoto> {
  const sourceUrl = kolesaModelUrl(model);
  if (!sourceUrl) return { imageUrl: null, sourceUrl: null };
  const response = await fetch(sourceUrl, {
    next: { revalidate: 900 },
    signal: AbortSignal.timeout(15_000),
    redirect: "error",
  });
  if (!response.ok) throw new Error("Kolesa unavailable");
  return parseKolesaListing(await response.text(), model);
}
