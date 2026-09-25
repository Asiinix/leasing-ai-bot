import { test } from "node:test";
import assert from "node:assert/strict";
import { kolesaModelUrl, parseKolesaPhoto } from "../src/lib/kolesa";

const model = { brand: "TOYOTA", name: "CAMRY" };
const photo = "https://kolesa-photos.kcdn.online/example.jpg";

test("Kolesa photo must identify the exact requested model and use its photo host", () => {
  const html = `<img src="${photo}" alt="Toyota Camry 2025 года за 10000000 тг.">`;
  assert.equal(parseKolesaPhoto(html, model), photo);
  assert.equal(parseKolesaPhoto(html, { brand: "TOYOTA", name: "CAMRY 70" }), null);
  assert.equal(parseKolesaPhoto(html, { brand: "HYUNDAI", name: "CAMRY" }), null);
  assert.equal(
    parseKolesaPhoto(html.replace("kolesa-photos.kcdn.online", "evil.example"), model),
    null,
  );
  assert.equal(parseKolesaPhoto(html.replace("https:", "http:"), model), null);
  assert.equal(parseKolesaPhoto("upstream unavailable", model), null);
});

test("model URLs handle repeated brands and reject unexpected path characters", () => {
  assert.equal(kolesaModelUrl(model), "https://kolesa.kz/cars/toyota/camry/");
  assert.equal(
    kolesaModelUrl({ brand: "Toyota", name: "Toyota Land Cruiser" }),
    "https://kolesa.kz/cars/toyota/land-cruiser/",
  );
  assert.equal(kolesaModelUrl({ brand: "../evil", name: "Camry" }), null);
  assert.equal(kolesaModelUrl({ brand: "Toyota", name: "Camry?x=1" }), null);
});

test("GAZ chassis indices resolve to Kolesa families without matching a different family", () => {
  for (const name of ["23107", "231073", "27527"]) {
    const model = { brand: "ГАЗ", name };
    assert.equal(kolesaModelUrl(model), "https://kolesa.kz/cars/gaz/sobol/");
    assert.equal(
      parseKolesaPhoto(
        `<img src="${photo}" alt="ГАЗ Соболь 27527 2026 года за 12096000 тг.">`,
        model,
      ),
      photo,
    );
    assert.equal(
      parseKolesaPhoto(`<img src="${photo}" alt="ГАЗ ГАЗель 2026 года за 12096000 тг.">`, model),
      null,
    );
  }
  for (const name of ["2705", "2705-750", "27055", "27057"]) {
    const model = { brand: "ГАЗ", name };
    assert.equal(kolesaModelUrl(model), "https://kolesa.kz/cars/gaz/3302-gazel/");
    assert.equal(
      parseKolesaPhoto(`<img src="${photo}" alt="ГАЗ ГАЗель 2015 года за 5000000 тг.">`, model),
      photo,
    );
    assert.equal(
      parseKolesaPhoto(
        `<img src="${photo}" alt="ГАЗ ГАЗель NEXT 2025 года за 15000000 тг.">`,
        model,
      ),
      null,
    );
  }
});

function listingHtml(id: number, name: string, model: string, price: unknown, brand = "Toyota") {
  const title = `${brand} ${name} 2026`;
  const item = {
    id,
    name: `${title} г.`,
    attributes: { brand, model },
    unitPrice: price,
    url: `https://kolesa.kz/a/show/${id}`,
  };
  return `<div id="advert-${id}"><img src="https://kolesa-photos.kcdn.online/${id}.jpg" alt="${title} года за 10000000 тг."><script>listing.items.push(${JSON.stringify(item)});</script></div>`;
}

test("listing price, image and source belong to the same car, ignoring unrelated banners", async () => {
  const { parseKolesaListing } = await import("../src/lib/kolesa");
  const html =
    listingHtml(1, "RAV4", "RAV4", 20000000) + listingHtml(2, "Camry", "Camry", 12345000);
  assert.deepEqual(parseKolesaListing(html, model), {
    imageUrl: "https://kolesa-photos.kcdn.online/2.jpg",
    sourceUrl: "https://kolesa.kz/a/show/2",
    listingTitle: "Toyota Camry 2026 г.",
    price: 12345000,
  });
  assert.equal(parseKolesaListing(listingHtml(1, "Camry", "Camry", -1), model).price, undefined);
  assert.equal(
    parseKolesaListing(listingHtml(1, "Camry", "Camry", "10000000"), model).price,
    undefined,
  );
});

test("family photo never imports a different chassis price", async () => {
  const { parseKolesaListing } = await import("../src/lib/kolesa");
  const html =
    listingHtml(1, "Соболь 27527", "Соболь", 12096000, "ГАЗ") +
    listingHtml(2, "Соболь 23107", "Соболь", 11435000, "ГАЗ");
  assert.equal(parseKolesaListing(html, { brand: "ГАЗ", name: "23107" }).price, 11435000);
  assert.equal(parseKolesaListing(html, { brand: "ГАЗ", name: "231073" }).price, undefined);
});
