import assert from "node:assert/strict";
import { readFileSync, realpathSync, statSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";
import sources from "../src/features/fixed-price-catalog/photo-sources.json";
import brandSources from "../src/features/fixed-price-catalog/brand-photo-sources.json";
import { vehiclePhoto } from "../src/features/fixed-price-catalog/photos";
import snapshot from "../src/data/colvir-snapshot.json";
import { normalizeCatalog } from "../src/lib/colvir";

const exactPhotos = Object.values(sources);
const brandPhotos = Object.values(brandSources);
const normalized = (value: string) => value.toLocaleLowerCase().replace(/[^\p{L}\p{N}]/gu, "");
const publicRoot = realpathSync(fileURLToPath(new URL("../public/", import.meta.url)));

test("exact model photos take priority over brand illustrations, including normalized names", () => {
  assert.ok(exactPhotos.length > 0);
  for (const source of exactPhotos) {
    assert.ok(brandPhotos.some((brand) => normalized(brand.brand) === normalized(source.brand)));
    for (const model of [
      source.model,
      `  ${source.brand.toLowerCase()} ${source.model.toLowerCase()}  `,
    ]) {
      const photo = vehiclePhoto({ brand: source.brand.toLowerCase(), model });
      assert.equal(photo?.kind, "model", `${source.brand} ${model}`);
      assert.equal(photo.src, source.localPath);
      assert.equal(photo.sourcePageUrl, source.sourcePageUrl);
      assert.match(photo.caption, /комплектация может отличаться/u);
    }
  }
});

test("brand illustrations stay illustrations even when their photographed model name matches", () => {
  for (const source of brandPhotos) {
    const hasExact = exactPhotos.some(
      (exact) =>
        normalized(exact.brand) === normalized(source.brand) &&
        normalized(exact.model) === normalized(source.model),
    );
    const model = hasExact ? "Unknown model for brand fallback" : source.model;
    const photo = vehiclePhoto({ brand: source.brand, model });
    assert.equal(photo?.kind, "brand-illustration", `${source.brand} ${model}`);
    assert.equal(photo.src, source.localPath);
    assert.match(photo.alt, /иллюстрация марки/u);
    assert.ok(photo.caption.includes(source.model));
    assert.equal(photo.credit, source.credit);
    assert.equal(photo.license, source.license);
    assert.equal(photo.licenseUrl, source.licenseUrl);
  }
});

test("unknown brands never borrow another brand's photo or fuzzy name match", () => {
  for (const brand of ["", "Unknown make", "Not HYUNDAI", "KIAAAA", "HYUNDAI dealership"]) {
    assert.equal(vehiclePhoto({ brand, model: "ELANTRA" }), null, brand);
  }
  const similarModel = vehiclePhoto({ brand: "HYUNDAI", model: "ELANTRA made-up variant" });
  assert.equal(similarModel?.kind, "brand-illustration");
  assert.notEqual(similarModel?.src, sources["HYUNDAI|ELANTRA"].localPath);
});

test("every manifest entry points to an actual local image within public/vehicles", () => {
  const seenPaths = new Set<string>();
  for (const source of [...exactPhotos, ...brandPhotos]) {
    assert.match(source.localPath, /^\/vehicles\//u);
    assert.ok(!seenPaths.has(source.localPath), `Duplicate asset: ${source.localPath}`);
    seenPaths.add(source.localPath);
    const imagePath = realpathSync(path.join(publicRoot, source.localPath));
    assert.ok(imagePath.startsWith(`${publicRoot}${path.sep}vehicles${path.sep}`));
    assert.ok(statSync(imagePath).isFile());
    const data = readFileSync(imagePath);
    assert.ok(data.length > 100, source.localPath);
    const jpeg = data[0] === 0xff && data[1] === 0xd8 && data[2] === 0xff;
    const png = data.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]));
    const webp =
      data.toString("ascii", 0, 4) === "RIFF" && data.toString("ascii", 8, 12) === "WEBP";
    assert.ok(jpeg || png || webp, `Not an image: ${source.localPath}`);
    assert.ok(["https:", "http:"].includes(new URL(source.sourcePageUrl).protocol));
  }
});

test("Commons assets retain author, source, license and license link for attribution", () => {
  for (const source of brandPhotos) {
    assert.equal(new URL(source.sourcePageUrl).hostname, "commons.wikimedia.org");
    assert.ok(source.credit.trim(), source.localPath);
    assert.ok(source.license.trim(), source.localPath);
    const license = new URL(source.licenseUrl);
    assert.ok(["http:", "https:"].includes(license.protocol));
    assert.equal(license.hostname, "creativecommons.org");
    assert.ok(source.modifications.trim());
    assert.ok(Number.isFinite(Date.parse(source.checkedAt)));
  }
});

test("full catalog coverage follows the available brand manifests without crossing brand boundaries", () => {
  const { models } = normalizeCatalog(snapshot.catalog.responses);
  const brandsWithImages = new Set(
    [...exactPhotos, ...brandPhotos].map((source) => normalized(source.brand)),
  );
  let covered = 0;
  for (const model of models) {
    const photo = vehiclePhoto({ brand: model.brand, model: model.name });
    assert.equal(
      Boolean(photo),
      brandsWithImages.has(normalized(model.brand)),
      `${model.brand} ${model.name}`,
    );
    if (!photo) continue;
    covered++;
    const source = [...exactPhotos, ...brandPhotos].find((entry) => entry.localPath === photo.src);
    assert.equal(normalized(source!.brand), normalized(model.brand));
  }
  assert.ok(covered > 0, "Catalog should have usable photography");
});
