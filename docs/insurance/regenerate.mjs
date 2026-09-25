/** Offline audit of every model/seller, using the same classifier as the UI. */
import fs from "node:fs";
import { normalizeCatalog } from "../../src/lib/colvir.ts";
import { classifyVehicle, VEHICLE_CATEGORIES } from "../../src/features/insurance/categories.ts";
const snapshot = JSON.parse(
  fs.readFileSync(new URL("../../src/data/colvir-snapshot.json", import.meta.url), "utf8"),
);
const items = normalizeCatalog(snapshot.catalog.responses).models.map((model) => ({
  modelId: model.id,
  partnerId: model.partnerId,
  brand: model.brand,
  model: model.name,
  ...classifyVehicle(model),
}));
const counts = Object.fromEntries(
  Object.keys(VEHICLE_CATEGORIES).map((category) => [
    category,
    items.filter((item) => item.category === category).length,
  ]),
);
fs.writeFileSync(
  new URL("catalog-classification.json", import.meta.url),
  JSON.stringify(
    {
      version: 1,
      catalogCheckedAt: snapshot.catalog.checkedAt,
      rateSource: "User-provided annual rates on full vehicle price",
      categories: VEHICLE_CATEGORIES,
      counts,
      needsReview: items.filter((item) => item.needsReview).length,
      items,
    },
    null,
    2,
  ) + "\n",
);
console.log(
  JSON.stringify({
    total: items.length,
    counts,
    needsReview: items.filter((item) => item.needsReview).length,
  }),
);
