import assert from "node:assert/strict";
import test from "node:test";
import { parseMessage } from "../src/lib/assistant.ts";

test("keeps desired monthly payment, advance, price and term in separate slots", () => {
  assert.deepEqual(
    parseMessage(
      "Я ИП. Машина стоит15млн, на аванс до3 млн, хочу платить до350 тысяч в месяц, срок48месяцев",
    ),
    {
      action: "calculate",
      clientType: "IP",
      price: 15_000_000,
      maxAdvance: 3_000_000,
      maxMonthly: 350_000,
      months: 48,
    },
  );
});

test("understands Russian number words from speech recognition", () => {
  assert.deepEqual(
    parseMessage(
      "Платеж до триста пятьдесят тысяч в месяц, аванс три миллиона, стоимость пятнадцать миллионов, срок сорок восемь месяцев",
    ),
    {
      action: "calculate",
      maxMonthly: 350_000,
      maxAdvance: 3_000_000,
      price: 15_000_000,
      months: 48,
    },
  );
});

test("handles decimal multipliers, grouped numbers and nonbreaking spaces", () => {
  assert.deepEqual(
    parseMessage("Цена 15 500 000 ₸; аванс 2,5 млн. ₸; платеж до 350\u202f000 тенге"),
    {
      action: "calculate",
      price: 15_500_000,
      maxAdvance: 2_500_000,
      maxMonthly: 350_000,
    },
  );
});

test("combines mixed digit and scale groups into a single amount", () => {
  assert.deepEqual(parseMessage("Аванс 2 млн 500 тысяч, цена 15 млн"), {
    action: "calculate",
    maxAdvance: 2_500_000,
    price: 15_000_000,
  });
});

test("allows amount-before-label phrasing without crossing clause boundaries", () => {
  assert.deepEqual(parseMessage("350 тысяч в месяц, 3 млн на аванс, машина 15 млн"), {
    action: "calculate",
    maxMonthly: 350_000,
    maxAdvance: 3_000_000,
    price: 15_000_000,
  });
});

test("request to choose a term explicitly releases only the term", () => {
  assert.deepEqual(parseMessage("Подбери срок"), { action: "calculate", months: null });
  assert.deepEqual(parseMessage("Срок можно подобрать"), { action: "calculate", months: null });
});

test("fixed years are converted into months", () => {
  assert.deepEqual(parseMessage("Срок четыре года"), { action: "calculate", months: 48 });
});

test("does not guess thousands for small bare money amounts", () => {
  const result = parseMessage("Платеж 350, аванс 3 млн");
  assert.equal(result.maxMonthly, undefined);
  assert.equal(result.maxAdvance, 3_000_000);
  assert.match(result.clarification!, /единицы/);
  const bare = parseMessage("350");
  assert.equal(bare.maxMonthly, undefined);
  assert.match(bare.clarification!, /Что означает/);
});

test("explicit tenge amounts remain exact even when small", () => {
  assert.deepEqual(parseMessage("Платеж 350 ₸"), { action: "calculate", maxMonthly: 350 });
});

test("percent advance is not silently converted to tenge", () => {
  const result = parseMessage("Аванс 20%");
  assert.equal(result.maxAdvance, undefined);
  assert.match(result.clarification!, /суммой в тенге/);
  assert.equal(parseMessage("Аванс в процентах 20").price, undefined);
  assert.match(parseMessage("Аванс в процентах 20").clarification!, /суммой в тенге/);
});

test("rejects negative amounts and unsupported foreign currency", () => {
  assert.equal(parseMessage("Аванс -3 млн").maxAdvance, undefined);
  assert.ok(parseMessage("Аванс -3 млн").clarification);
  const dollars = parseMessage("Цена 15000 долларов");
  assert.equal(dollars.price, undefined);
  assert.match(dollars.clarification!, /тенге/);
});

test("handles reduction and explanation intents without inventing a target", () => {
  assert.deepEqual(parseMessage("Снизить платеж"), { action: "lower_payment" });
  assert.deepEqual(parseMessage("Уменьши первоначальный взнос"), { action: "lower_advance" });
  assert.deepEqual(parseMessage("Почему такой платеж?"), { action: "explain" });
  assert.deepEqual(parseMessage("Как считается платеж?"), { action: "explain" });
});

test("payment reduction does not become advance reduction when both are mentioned", () => {
  const result = parseMessage("Снизь платеж до 350 тыс и сохрани аванс 3 млн");
  assert.equal(result.action, "lower_payment");
  assert.equal(result.maxMonthly, 350_000);
  assert.equal(result.maxAdvance, 3_000_000);
});

test("client type is optional and ambiguous types need clarification", () => {
  assert.deepEqual(parseMessage("Оформляю на ТОО"), { action: "calculate", clientType: "TOO" });
  const result = parseMessage("ИП или ТОО");
  assert.equal(result.clientType, undefined);
  assert.match(result.clarification!, /тип клиента/);
});

test("zero advance is a preference, not an invented available product", () => {
  assert.deepEqual(parseMessage("Хочу без аванса"), { action: "calculate", maxAdvance: 0 });
});

test("invalid term does not enter the state", () => {
  assert.equal(parseMessage("Срок 0 месяцев").months, undefined);
  assert.ok(parseMessage("Срок 0 месяцев").clarification);
  assert.equal(parseMessage("Срок 3,5 месяца").months, undefined);
  assert.ok(parseMessage("Срок 3,5 месяца").clarification);
});

test("maximum term is not silently interpreted as a fixed term", () => {
  const result = parseMessage("Срок до 48 месяцев");
  assert.equal(result.months, undefined);
  assert.match(result.clarification!, /конкретный срок/);
});

test("production year is not interpreted as term or price", () => {
  assert.deepEqual(parseMessage("Автомобиль 2026 года, цена 15 млн"), {
    action: "calculate",
    price: 15_000_000,
  });
});

test("all three integration prompt buttons preserve their intended action", () => {
  assert.deepEqual(parseMessage("Хочу платить до 350 тысяч в месяц, на аванс до 3 млн"), {
    action: "calculate",
    maxMonthly: 350_000,
    maxAdvance: 3_000_000,
  });
  assert.deepEqual(parseMessage("Снизить первоначальный взнос"), { action: "lower_advance" });
  assert.deepEqual(parseMessage("Как считается платеж?"), { action: "explain" });
});

test("an explicit correction uses the new amount rather than the rejected amount", () => {
  assert.deepEqual(parseMessage("Цена не 15 млн, а 20 млн"), {
    action: "calculate",
    price: 20_000_000,
  });
  assert.deepEqual(parseMessage("Платеж не 350 тысяч, а 300 тысяч"), {
    action: "calculate",
    maxMonthly: 300_000,
  });
  const incomplete = parseMessage("Цена не 15 млн");
  assert.equal(incomplete.price, undefined);
  assert.ok(incomplete.clarification);
});

test("an amount-only follow-up needs the UI to provide its awaited field context", () => {
  const alone = parseMessage("15 млн");
  assert.equal(alone.price, undefined);
  assert.ok(alone.clarification);
  assert.deepEqual(parseMessage("Стоимость 15 млн"), { action: "calculate", price: 15_000_000 });
});

test("clarification identifies one ambiguous money slot and preserves other clear fields", () => {
  const result = parseMessage("платеж350, аванс2млн");
  assert.equal(result.maxMonthly, undefined);
  assert.equal(result.maxAdvance, 2_000_000);
  assert.equal(result.clarificationSlot, "maxMonthly");
  assert.ok(result.clarification);
});

test("clarification slot covers percentages, currencies and invalid amounts", () => {
  assert.equal(parseMessage("Аванс20%").clarificationSlot, "maxAdvance");
  assert.equal(parseMessage("Цена15000 долларов").clarificationSlot, "price");
  assert.equal(parseMessage("Аванс-3млн").clarificationSlot, "maxAdvance");
  assert.equal(parseMessage("Цена0тенге").clarificationSlot, "price");
  assert.equal(parseMessage("Платеж0тенге").clarificationSlot, "maxMonthly");
});

test("multiple ambiguous fields or an unlabelled amount do not guess a clarification slot", () => {
  const multiple = parseMessage("Платеж350, аванс20%, цена15млн");
  assert.equal(multiple.clarificationSlot, undefined);
  assert.equal(multiple.price, 15_000_000);
  assert.ok(multiple.clarification);
  assert.equal(parseMessage("350").clarificationSlot, undefined);
  assert.equal(parseMessage("Срок0месяцев").clarificationSlot, undefined);
});

test("unrelated or empty text does not mutate financial slots", () => {
  assert.deepEqual(parseMessage("Привет!"), { action: "unknown" });
  assert.deepEqual(parseMessage(""), { action: "unknown" });
});
