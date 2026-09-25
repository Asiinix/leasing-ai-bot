/**
 * Photo and market price for the car catalog, taken from kolesa.kz listings of the same
 * brand and model. A listing is used only when its caption names exactly this brand and
 * model, so a card never shows a different car. The price is the median of the newest
 * model year on sale — a starting point the client then checks with the seller.
 * Results are cached in memory: kolesa.kz is queried at most once per model per day.
 */
import type { LeaseModel } from "./types";

export interface VehicleMarket {
  imageUrl: string | null;
  /** Median price of the newest listings, KZT; null when no listing shows a price. */
  price: number | null;
  /** Model year the price is for. */
  year: number | null;
  /** Number of listings the price is based on. */
  listings: number;
  sourceUrl: string;
  /** The photo shows another model of the same brand. */
  brandPhoto?: boolean;
}

interface Listing {
  imageUrl: string | null;
  year: number;
  price: number | null;
}

const BRAND_SLUGS: Record<string, string> = {
  газ: "gaz",
  lada: "vaz",
  "land rover": "land-rover",
  "great wall": "great-wall",
};

const letters = (value: string) => value.toLowerCase().replace(/[^\p{L}\d]/gu, "");
const LATIN_SLUG = /^[a-z0-9-]+$/;

/** Model words without the brand prefix («Camry 2.5 Prestige» → [camry, 2.5, prestige]). */
function modelWords(model: Pick<LeaseModel, "brand" | "name">) {
  let name = model.name.toLowerCase().trim();
  const brand = model.brand.toLowerCase().trim();
  if (name.startsWith(`${brand} `)) name = name.slice(brand.length).trim();
  return name.split(/\s+/).filter(Boolean);
}

function brandSlug(model: Pick<LeaseModel, "brand">) {
  const brand = model.brand.toLowerCase().trim();
  const slug = BRAND_SLUGS[brand] ?? brand.replace(/\s+/g, "-");
  return LATIN_SLUG.test(slug) ? slug : null;
}

/** Brand page: the fallback photo when the model itself is not found. */
export function kolesaBrandUrl(model: Pick<LeaseModel, "brand">): string | null {
  const slug = brandSlug(model);
  return slug ? `https://kolesa.kz/cars/${slug}/` : null;
}

/** Model pages to try, most specific first («CS35 PLUS» → cs35-plus, cs35). */
export function kolesaModelUrls(model: Pick<LeaseModel, "brand" | "name">): string[] {
  const slug = brandSlug(model);
  const words = modelWords(model);
  if (!slug || !words.length) return [];
  const names = [words.slice(0, 2).join("-"), words[0]];
  // Cyrillic chassis indexes («ГАЗ 3302») have no stable page: better no data than wrong data.
  return [...new Set(names)]
    .filter((name) => LATIN_SLUG.test(name))
    .map((name) => `https://kolesa.kz/cars/${slug}/${name}/`);
}

export function kolesaSearchUrl(model: Pick<LeaseModel, "brand" | "name">): string | null {
  return kolesaModelUrls(model).at(-1) ?? null;
}

/** Listings whose caption starts with «<Brand> <Model>», in page order. */
export function parseListings(
  html: string,
  model: Pick<LeaseModel, "brand"> & { name?: string },
): Listing[] {
  // Without a model name any listing of the brand counts (brand-page fallback).
  const first = model.name ? (modelWords({ brand: model.brand, name: model.name })[0] ?? "") : "";
  const expected = letters(`${model.brand} ${first}`);
  const brandWords = model.brand.trim().split(/\s+/).length + (first ? 1 : 0);
  const listings: Listing[] = [];
  for (const match of html.matchAll(/<img\b[^>]*>/gi)) {
    const tag = match[0];
    const alt = (tag.match(/\balt="([^"]*)"/i)?.[1] ?? "").replace(/&nbsp;| /g, " ");
    // «Toyota Camry Luxe 2026 года за 25 190 000 тг. в Астана»
    const parts = alt.match(/^(.*?)\s+(\d{4})\s+(?:года|г\.)(?:\s+за\s+([\d\s]+)\s*(?:тг|₸))?/u);
    if (!parts) continue;
    const words = parts[1].split(/\s+/);
    if (letters(words.slice(0, brandWords).join(" ")) !== expected) continue;
    const src = tag.match(/\bsrc="([^"]*)"/i)?.[1];
    const imageUrl =
      src && /^https:\/\/[a-z0-9.-]+\.kcdn\.online\//.test(src)
        ? // Listing thumbnails are 255×138; the same file exists in 510×276 for retina cards.
          src.replace(/-255x138\.(jpg|webp)$/, "-510x276.$1")
        : null;
    const price = parts[3] ? Number(parts[3].replace(/\s/g, "")) : null;
    listings.push({ imageUrl, year: Number(parts[2]), price: price && price > 0 ? price : null });
  }
  return listings;
}

/** Photo and median price of the newest model year among the listings. */
export function summarizeListings(listings: Listing[], sourceUrl: string): VehicleMarket | null {
  if (!listings.length) return null;
  const year = Math.max(...listings.map((item) => item.year));
  const newest = listings.filter((item) => item.year === year);
  const prices = newest
    .map((item) => item.price)
    .filter((price): price is number => price !== null)
    .sort((a, b) => a - b);
  const middle = Math.floor(prices.length / 2);
  const median = prices.length
    ? prices.length % 2
      ? prices[middle]
      : (prices[middle - 1] + prices[middle]) / 2
    : null;
  return {
    imageUrl:
      (newest.find((item) => item.imageUrl) ?? listings.find((item) => item.imageUrl))?.imageUrl ??
      null,
    // Round to 10 000 ₸: this is an estimate, not a seller's price.
    price: median === null ? null : Math.round(median / 10_000) * 10_000,
    year: median === null ? null : year,
    listings: prices.length,
    sourceUrl,
  };
}

const DAY = 24 * 60 * 60 * 1000;
const pages = new Map<string, { html: string | null; expires: number }>();
const pending = new Map<string, Promise<string | null>>();
let active = 0;
const queue: Array<() => void> = [];

/** At most three requests to kolesa.kz at a time, however many cards are on screen. */
async function limited<T>(task: () => Promise<T>): Promise<T> {
  if (active >= 3) await new Promise<void>((resolve) => queue.push(resolve));
  active += 1;
  try {
    return await task();
  } finally {
    active -= 1;
    queue.shift()?.();
  }
}

/** Page HTML, cached per URL: a day on success, briefly after a network error. */
async function page(url: string, fetchImpl: typeof fetch): Promise<string | null> {
  const hit = pages.get(url);
  if (hit && hit.expires > Date.now()) return hit.html;
  const running = pending.get(url);
  if (running) return running;
  const request = limited(async () => {
    try {
      const response = await fetchImpl(url, {
        headers: { "User-Agent": "Mozilla/5.0 (BCC Leasing catalog)", Accept: "text/html" },
        signal: AbortSignal.timeout(8000),
      });
      if (!response.ok) return { html: null, ttl: response.status === 404 ? DAY : 10 * 60_000 };
      return { html: await response.text(), ttl: DAY };
    } catch {
      return { html: null, ttl: 60_000 };
    }
  })
    .then(({ html, ttl }) => {
      pages.set(url, { html, expires: Date.now() + ttl });
      return html;
    })
    .finally(() => pending.delete(url));
  pending.set(url, request);
  return request;
}

/**
 * Model photo and price from its kolesa.kz page. When the model is not found, the card
 * still gets a photo of the same brand (without a price: it would belong to another model).
 */
export async function findVehicleMarket(
  model: Pick<LeaseModel, "brand" | "name">,
  fetchImpl: typeof fetch = fetch,
): Promise<VehicleMarket | null> {
  for (const url of kolesaModelUrls(model)) {
    const html = await page(url, fetchImpl);
    const market = html ? summarizeListings(parseListings(html, model), url) : null;
    if (market) return market;
  }
  const brandUrl = kolesaBrandUrl(model);
  const html = brandUrl ? await page(brandUrl, fetchImpl) : null;
  const brand = html
    ? summarizeListings(parseListings(html, { brand: model.brand }), brandUrl!)
    : null;
  return brand?.imageUrl
    ? { ...brand, price: null, year: null, listings: 0, brandPhoto: true }
    : null;
}
