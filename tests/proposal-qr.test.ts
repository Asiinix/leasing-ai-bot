import test from "node:test";
import assert from "node:assert/strict";
import { deflateRawSync } from "node:zlib";
import jsQR from "jsqr";
import { PNG } from "pngjs";
import {
  encodeResume,
  decodeResume,
  publicCalculatorLink,
  PUBLIC_CALCULATOR_URL,
} from "../src/features/proposal/resume-link";
import { proposalQr } from "../src/features/proposal/qr";
import {
  proposalForm,
  matchesProposalForm,
  restoredTerms,
} from "../src/features/proposal/restoration";
import { proposalCalculation, type ProposalSnapshot } from "../src/features/proposal/snapshot";
import type { TermsData } from "../src/lib/types";

const saved: ProposalSnapshot = {
  version: 1,
  createdAt: "2026-09-25T10:21:58.832Z",
  clientType: "TOO",
  model: {
    id: 2875,
    name: "TUCSON",
    brand: "HYUNDAI",
    partnerId: 164,
    partnerName: "Общий каталог авто",
  },
  price: 17_250_000,
  rate: { modelId: 2875, months: 60, advancePercent: 25, annualRate: 23.95, rateId: 2181 },
  termsSource: "live",
  termsCheckedAt: "2026-09-25T10:21:11.734Z",
  priceSource: "estimate",
  trim: "Comfort · 2.0 AT",
  modelYear: 2026,
  insurance: { enabled: true, category: "truck" },
  osrns: { oked: "07101", annualPayroll: 10_000_000 },
};

test("public resume link round-trips all proposal inputs on the specified Railway root", () => {
  const url = new URL(publicCalculatorLink(saved));
  assert.equal(url.origin + url.pathname, PUBLIC_CALCULATOR_URL);
  assert.ok(url.href.length < 1_000);
  const decoded = decodeResume(url.searchParams.get("resume"));
  assert.deepEqual(decoded, saved);
  assert.deepEqual(proposalCalculation(decoded!), proposalCalculation(saved));
  assert.deepEqual(proposalForm(decoded!), {
    clientType: "TOO",
    modelId: 2875,
    price: 17_250_000,
    months: 60,
    advancePercent: 25,
    catalogPrice: false,
  });
});

test("actual QR pixels decode to the exact public URL and its calculation", async () => {
  const qr = await proposalQr(saved);
  const png = PNG.sync.read(Buffer.from(qr.image.split(",")[1], "base64"));
  const scan = jsQR(new Uint8ClampedArray(png.data), png.width, png.height);
  assert.ok(scan);
  assert.equal(scan.data, qr.href);
  assert.deepEqual(decodeResume(new URL(scan.data).searchParams.get("resume")), saved);
});

test("disabled CASCO and absent OSRNS are retained", () => {
  const withoutOsrns = { ...saved };
  delete withoutOsrns.osrns;
  const original = { ...withoutOsrns, insurance: { ...saved.insurance, enabled: false } };
  assert.deepEqual(decodeResume(encodeResume(original)), original);
});

test("malformed, truncated and oversized resume data fail without throwing", () => {
  for (const bad of [
    null,
    undefined,
    "",
    [],
    [encodeResume(saved)],
    "2.abc",
    "1.!",
    "1.abc",
    "1." + "x".repeat(6_000),
    encodeResume(saved).slice(0, -20),
  ])
    assert.equal(decodeResume(bad), null);
  const bomb = "1." + deflateRawSync(Buffer.from(" ".repeat(100_000))).toString("base64url");
  assert.equal(decodeResume(bomb), null);
  const wrong =
    "1." +
    deflateRawSync(Buffer.from(JSON.stringify({ ...saved, price: -1 }))).toString("base64url");
  assert.equal(decodeResume(wrong), null);
});

test("unrelated values and redirect targets cannot be injected into a generated QR", () => {
  const input = { ...saved, redirect: "https://example.org/", monthlyPayment: 1 };
  assert.deepEqual(decodeResume(encodeResume(input)), saved);
  assert.equal(new URL(publicCalculatorLink(input)).origin, new URL(PUBLIC_CALCULATOR_URL).origin);
});

test("restoration keeps the original rate despite refreshed tariffs and never invents limits", () => {
  const current: TermsData = {
    rates: [
      { ...saved.rate, annualRate: 30 },
      { ...saved.rate, months: 48 },
    ],
    limits: [],
    source: "live",
    checkedAt: "2026-10-01T00:00:00Z",
  };
  const restored = restoredTerms(saved, current);
  assert.deepEqual(restored.rates[0], saved.rate);
  assert.equal(restored.rates.length, 2);
  assert.equal(restored.source, "snapshot");
  assert.equal(restored.checkedAt, saved.termsCheckedAt);
  assert.deepEqual(restoredTerms(saved, null).limits, []);
  assert.equal(matchesProposalForm(saved, proposalForm(saved)), true);
  assert.equal(matchesProposalForm(saved, { ...proposalForm(saved), price: 20_000_000 }), false);
  assert.equal(matchesProposalForm(saved, { ...proposalForm(saved), clientType: "IP" }), false);
});
