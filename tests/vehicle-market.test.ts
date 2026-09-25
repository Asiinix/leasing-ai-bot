import assert from "node:assert/strict";
import test from "node:test";

import {
  findVehicleMarket,
  kolesaBrandUrl,
  kolesaModelUrls,
  kolesaSearchUrl,
  parseListings,
  summarizeListings,
} from "../src/lib/vehicle-market.ts";

const card = (alt: string, id: string) =>
  `<img src="https://kolesa-photos.kcdn.online/webp/${id}/1-255x138.jpg" alt="${alt}" width="255">`;

test("kolesa URL is built only for Latin brand and model slugs", () => {
  assert.equal(
    kolesaSearchUrl({ brand: "TOYOTA", name: "CAMRY" }),
    "https://kolesa.kz/cars/toyota/camry/",
  );
  assert.equal(
    kolesaSearchUrl({ brand: "LAND ROVER", name: "DEFENDER 110" }),
    "https://kolesa.kz/cars/land-rover/defender/",
  );
  assert.deepEqual(kolesaModelUrls({ brand: "CHANGAN", name: "CS35 PLUS" }), [
    "https://kolesa.kz/cars/changan/cs35-plus/",
    "https://kolesa.kz/cars/changan/cs35/",
  ]);
  // Cyrillic model names have no page; the brand page is still usable for a photo.
  assert.deepEqual(kolesaModelUrls({ brand: "MERCEDES-BENZ", name: "С 260L" }), []);
  assert.equal(kolesaBrandUrl({ brand: "ГАЗ" }), "https://kolesa.kz/cars/gaz/");
});

test("only listings of the same brand and model count", () => {
  const html = [
    card("Toyota Corolla 2026 года за 12 000 000 тг. в Алматы", "aa"),
    card("Toyota Camry Luxe 2026 года за 25 190 000 тг. в Астана", "bb"),
  ].join("");
  const camry = parseListings(html, { brand: "TOYOTA", name: "CAMRY" });
  assert.deepEqual(camry, [
    {
      imageUrl: "https://kolesa-photos.kcdn.online/webp/bb/1-510x276.jpg",
      year: 2026,
      price: 25_190_000,
    },
  ]);
  assert.deepEqual(parseListings(html, { brand: "TOYOTA", name: "RAV4" }), []);
  assert.deepEqual(parseListings(html, { brand: "LEXUS", name: "CAMRY" }), []);
});

test("price is the rounded median of the newest model year", () => {
  const html = [
    card("Kia K5 2019 года за 7 000 000 тг.", "a1"),
    card("Kia K5 2025 года за 15 000 000 тг.", "a2"),
    card("Kia K5 2025 года за 16 004 000 тг.", "a3"),
    card("Kia K5 2025 года за 30 000 000 тг.", "a4"),
  ].join("");
  const market = summarizeListings(parseListings(html, { brand: "KIA", name: "K5" }), "src");
  assert.equal(market?.price, 16_000_000);
  assert.equal(market?.year, 2025);
  assert.equal(market?.listings, 3);
  assert.equal(market?.imageUrl, "https://kolesa-photos.kcdn.online/webp/a2/1-510x276.jpg");
  assert.equal(summarizeListings([], "src"), null);
});

test("market lookup is cached and survives network errors", async () => {
  let calls = 0;
  const ok = (async () => {
    calls += 1;
    return new Response(card("Kia Rio 2024 года за 8 000 000 тг.", "cc"));
  }) as typeof fetch;
  const first = await findVehicleMarket({ brand: "KIA", name: "RIO" }, ok);
  const second = await findVehicleMarket({ brand: "KIA", name: "RIO" }, ok);
  assert.equal(first?.price, 8_000_000);
  assert.deepEqual(second, first);
  assert.equal(calls, 1);

  const brandOnly = (async (url: string) =>
    new Response(
      String(url).endsWith("/cars/gaz/")
        ? card("ГАЗ ГАЗель Next 2024 года за 12 000 000 тг.", "dd")
        : card("ГАЗ Соболь 2020 года за 5 000 000 тг.", "ee"),
    )) as typeof fetch;
  const gaz = await findVehicleMarket({ brand: "ГАЗ", name: "3302" }, brandOnly);
  assert.equal(gaz?.imageUrl, "https://kolesa-photos.kcdn.online/webp/dd/1-510x276.jpg");
  assert.equal(gaz?.brandPhoto, true);
  assert.equal(gaz?.price, null);

  const down = (async () => {
    throw new TypeError("fetch failed");
  }) as typeof fetch;
  assert.equal(await findVehicleMarket({ brand: "KIA", name: "SPORTAGE" }, down), null);
});
