/** Offline deterministic generator. Run from the project root with the tsx loader. */
import fs from "node:fs";
import { normalizeCatalog } from "../../src/lib/colvir.ts";
import { createVehiclePriceRecord } from "../../src/features/fixed-price-catalog/pricing.ts";
import {
  PRICE_RULES_VERSION,
  PRICE_ESTIMATED_AT,
} from "../../src/features/fixed-price-catalog/price-rules.ts";
const snapshot = JSON.parse(
  fs.readFileSync(new URL("../../src/data/colvir-snapshot.json", import.meta.url), "utf8"),
);
const items = normalizeCatalog(snapshot.catalog.responses).models.map(createVehiclePriceRecord);
const data = {
  schemaVersion: 1,
  generatedAt: PRICE_ESTIMATED_AT,
  catalogCheckedAt: snapshot.catalog.checkedAt,
  rulesVersion: PRICE_RULES_VERSION,
  currency: "KZT",
  purpose:
    "Synthetic teaching fixtures, not market valuations or dealer inventory. Six dated public price references are preserved.",
  items,
};
fs.writeFileSync(
  new URL("../../src/features/fixed-price-catalog/price-snapshot.json", import.meta.url),
  `${JSON.stringify(data, null, 2)}\n`,
);
console.log(`Saved ${items.length} fixed demo prices.`);
