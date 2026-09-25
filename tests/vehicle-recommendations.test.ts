import assert from "node:assert/strict";
import test from "node:test";
import { calculateQuote } from "../src/lib/finance";
import { buildVehicleCatalog } from "../src/features/fixed-price-catalog/catalog";
import type { VehicleOffer } from "../src/features/chat-vehicle-cards/search";
import {
  getVehicleOfferPage,
  isMoreVehiclesRequest,
} from "../src/features/chat-vehicle-cards/recommendations";

test("recognizes typed or dictated requests for more vehicles within the same budget", () => {
  for (const text of [
    "Ещё",
    "  ещё!!! ",
    "ещё варианты",
    "Покажи другие машины.",
    "Другие автомобили",
    "Давай ещё варианты, пожалуйста!",
    "Можно ещё?",
    "Какие ещё есть варианты?",
    "Хочу посмотреть другие авто",
    "Ещё варианты под ваш бюджет",
    "Покажи ещё варианты под мой бюджет",
    "Подбери другие машины в том же бюджете",
  ])
    assert.equal(isMoreVehiclesRequest(text), true, text);
});

test("does not intercept negations, explanations, or new budget and client constraints", () => {
  for (const text of [
    "",
    "   ",
    "не показывай другие машины",
    "не надо еще",
    "больше не надо",
    "Как вы находите другие машины?",
    "Почему другие варианты не подходят?",
    "Покажи ещё варианты до 300 тысяч",
    "Другие машины с авансом до 2 млн",
    "Ещё варианты до трёхсот тысяч в месяц",
    "Ещё, но на 60 месяцев",
    "Ещё варианты для ТОО",
    "Другие варианты на пять лет",
    "Ещё, подешевле",
    "Хочу изменить платеж",
    "Мой бюджет 600000, аванс 3000000",
    "Покажи другие машины с меньшим авансом",
  ])
    assert.equal(isMoreVehiclesRequest(text), false, text);
});

function makeOffers(count: number): VehicleOffer[] {
  return Array.from({ length: count }, (_, index) => {
    const modelId = index + 1;
    const vehicle = buildVehicleCatalog([
      { id: modelId, brand: "DEMO", name: `MODEL ${modelId}`, partnerId: 1, partnerName: "Demo" },
    ])[0];
    const rate = { modelId, months: 60, advancePercent: 20, annualRate: 24, rateId: modelId };
    return {
      vehicle,
      quote: calculateQuote(vehicle.priceKzt!, rate),
      terms: {
        rates: [rate],
        limits: [{ advancePercent: 20, minPrice: 1, maxPrice: 100_000_000 }],
        source: "snapshot",
        checkedAt: "2026-09-25T00:00:00.000Z",
      },
    };
  });
}

test("pages ranked offers in groups of three without duplicates or result mutation", () => {
  const offers = makeOffers(7);
  const original = [...offers];
  const first = getVehicleOfferPage(offers, 0);
  const second = getVehicleOfferPage(offers, first.nextOffset);
  const last = getVehicleOfferPage(offers, second.nextOffset);
  assert.deepEqual([first.offers.length, second.offers.length, last.offers.length], [3, 3, 1]);
  assert.deepEqual([first.hasMore, second.hasMore, last.hasMore], [true, true, false]);
  assert.deepEqual([...first.offers, ...second.offers, ...last.offers], original);
  assert.deepEqual(offers, original);
  assert.deepEqual(getVehicleOfferPage(offers, last.nextOffset), {
    offers: [],
    nextOffset: 7,
    hasMore: false,
  });
});

test("clamps invalid offsets and page sizes without wrapping to repeat an exhausted page", () => {
  const offers = makeOffers(4);
  for (const offset of [-1, Number.NaN, Number.POSITIVE_INFINITY]) {
    assert.deepEqual(getVehicleOfferPage(offers, offset), getVehicleOfferPage(offers, 0));
  }
  assert.deepEqual(getVehicleOfferPage(offers, 100), { offers: [], nextOffset: 4, hasMore: false });
  assert.deepEqual(getVehicleOfferPage(offers, 1.9, 2.9), {
    offers: offers.slice(1, 3),
    nextOffset: 3,
    hasMore: true,
  });
  for (const size of [-2, 0, 0.5, Number.NaN, Number.POSITIVE_INFINITY]) {
    assert.equal(getVehicleOfferPage(offers, 0, size).offers.length, 3);
  }
  assert.deepEqual(getVehicleOfferPage([], 9), { offers: [], nextOffset: 0, hasMore: false });
});
