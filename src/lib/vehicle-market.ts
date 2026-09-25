/**
 * Photo and market price for the car catalog, taken from kolesa.kz listings of the same
 * brand and model. A listing is used only when its caption names exactly this brand and
 * model, so a card never shows a different car. The price is the median of the newest
 * model year on sale — a starting point the client then checks with the seller.
 * Results are cached in memory: kolesa.kz is queried at most once per model per day.
 */
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
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

interface CaptionedListing extends Listing {
  caption: string;
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

/** Every listing on a page with its caption: small enough to keep in memory per page. */
export function parseAllListings(html: string): CaptionedListing[] {
  const listings: CaptionedListing[] = [];
  for (const match of html.matchAll(/<img\b[^>]*>/gi)) {
    const tag = match[0];
    const alt = (tag.match(/\balt="([^"]*)"/i)?.[1] ?? "").replace(/&nbsp;|\u00a0/g, " ");
    // «Toyota Camry Luxe 2026 года за 25 190 000 тг. в Астана»
    const parts = alt.match(/^(.*?)\s+(\d{4})\s+(?:года|г\.)(?:\s+за\s+([\d\s]+)\s*(?:тг|₸))?/u);
    if (!parts) continue;
    const src = tag.match(/\bsrc="([^"]*)"/i)?.[1];
    const imageUrl =
      src && /^https:\/\/[a-z0-9.-]+\.kcdn\.online\//.test(src)
        ? // Listing thumbnails are 255×138; the same file exists in 510×276 for retina cards.
          src.replace(/-255x138\.(jpg|webp)$/, "-510x276.$1")
        : null;
    const price = parts[3] ? Number(parts[3].replace(/\s/g, "")) : null;
    listings.push({
      caption: parts[1],
      imageUrl,
      year: Number(parts[2]),
      price: price && price > 0 ? price : null,
    });
  }
  return listings;
}

/** Listings whose caption starts with «<Brand> <Model>» (any model without a name). */
export function matchListings(
  listings: CaptionedListing[],
  model: Pick<LeaseModel, "brand"> & { name?: string },
): Listing[] {
  const first = model.name ? (modelWords({ brand: model.brand, name: model.name })[0] ?? "") : "";
  const expected = letters(`${model.brand} ${first}`);
  const count = model.brand.trim().split(/\s+/).length + (first ? 1 : 0);
  return listings
    .filter((item) => letters(item.caption.split(/\s+/).slice(0, count).join(" ")) === expected)
    .map(({ imageUrl, year, price }) => ({ imageUrl, year, price }));
}

export function parseListings(
  html: string,
  model: Pick<LeaseModel, "brand"> & { name?: string },
): Listing[] {
  return matchListings(parseAllListings(html), model);
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
const WEEK = 7 * DAY;
/** Parsed listings per page URL; undefined value = page is not available right now. */
const pages = new Map<string, { listings: CaptionedListing[] | null; expires: number }>();
const pending = new Map<string, Promise<CaptionedListing[] | null | undefined>>();
let active = 0;
const queue: Array<() => void> = [];
/** After a network failure kolesa.kz is not queried for a while: cards fall back at once. */
let offlineUntil = 0;

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

/**
 * Listings of a page, cached per URL for a day. null — the page has no data;
 * undefined — kolesa.kz did not answer, the caller may use older saved data.
 */
async function page(
  url: string,
  fetchImpl: typeof fetch,
): Promise<CaptionedListing[] | null | undefined> {
  const hit = pages.get(url);
  if (hit && hit.expires > Date.now()) return hit.listings;
  if (Date.now() < offlineUntil) return undefined;
  const running = pending.get(url);
  if (running) return running;
  const request = limited(async () => {
    if (Date.now() < offlineUntil) return undefined;
    try {
      const response = await fetchImpl(url, {
        headers: { "User-Agent": "Mozilla/5.0 (BCC Leasing catalog)", Accept: "text/html" },
        signal: AbortSignal.timeout(6000),
      });
      if (!response.ok && response.status !== 404) throw new Error(`HTTP ${response.status}`);
      const listings = response.ok ? parseAllListings(await response.text()) : null;
      pages.set(url, { listings, expires: Date.now() + DAY });
      return listings;
    } catch {
      offlineUntil = Date.now() + 2 * 60_000;
      return undefined;
    }
  }).finally(() => pending.delete(url));
  pending.set(url, request);
  return request;
}

/**
 * Found photos and prices are saved to disk: after a restart or while kolesa.kz is
 * unavailable, the catalog keeps showing them instead of placeholders.
 */
const storeFile = () =>
  process.env.VEHICLE_MARKET_FILE ?? path.join(process.cwd(), ".data", "vehicle-market.json");
let stored: Record<string, { value: VehicleMarket; savedAt: number }> | null = null;
let saving: Promise<void> = Promise.resolve();

async function loadStore() {
  if (stored) return stored;
  try {
    stored = JSON.parse(await readFile(storeFile(), "utf8"));
  } catch {
    stored = {};
  }
  return stored!;
}

function saveStore() {
  saving = saving
    .then(async () => {
      await mkdir(path.dirname(storeFile()), { recursive: true });
      await writeFile(storeFile(), JSON.stringify(stored));
    })
    .catch(() => {
      // The disk cache is an optimization: the catalog works without it.
    });
}

async function lookup(
  model: Pick<LeaseModel, "brand" | "name">,
  fetchImpl: typeof fetch,
): Promise<{ value: VehicleMarket | null; offline: boolean }> {
  let offline = false;
  for (const url of kolesaModelUrls(model)) {
    const listings = await page(url, fetchImpl);
    if (listings === undefined) offline = true;
    const market = listings ? summarizeListings(matchListings(listings, model), url) : null;
    if (market) return { value: market, offline: false };
  }
  const brandUrl = kolesaBrandUrl(model);
  const listings = brandUrl ? await page(brandUrl, fetchImpl) : null;
  if (listings === undefined) offline = true;
  const brand = listings
    ? summarizeListings(matchListings(listings, { brand: model.brand }), brandUrl!)
    : null;
  return {
    value: brand?.imageUrl
      ? { ...brand, price: null, year: null, listings: 0, brandPhoto: true }
      : null,
    offline,
  };
}

/**
 * Model photo and price from its kolesa.kz page. When the model is not found, the card
 * still gets a photo of the same brand (without a price: it would belong to another model).
 */
export async function findVehicleMarket(
  model: Pick<LeaseModel, "brand" | "name">,
  fetchImpl: typeof fetch = fetch,
): Promise<VehicleMarket | null> {
  const key = `${model.brand}|${model.name}`.toUpperCase();
  const store = await loadStore();
  const saved = store[key];
  if (saved && Date.now() - saved.savedAt < WEEK) return saved.value;
  const { value, offline } = await lookup(model, fetchImpl);
  if (value) {
    store[key] = { value, savedAt: Date.now() };
    saveStore();
    return value;
  }
  // kolesa.kz is down: an older saved result is better than a placeholder.
  return offline && saved ? saved.value : null;
}
