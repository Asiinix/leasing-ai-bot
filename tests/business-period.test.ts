import assert from "node:assert/strict";
import test from "node:test";
import { parseMessage } from "../src/lib/assistant.ts";

test("business figures default to annual without becoming lease payment or price", () => {
  for (const input of [
    "Плачу 20 миллионов налогов",
    "Налоговые отчисления 20 млн за год",
    "Выручка 120 млн, расходы 80 млн",
    "Доход двадцать миллионов",
  ]) {
    assert.deepEqual(parseMessage(input), {
      action: "business_finance",
      businessPeriods: ["year"],
    });
  }
});

test("explicit reporting periods override annual default", () => {
  for (const input of ["Налоги 2 млн в месяц", "Ежемесячная выручка 10 млн"]) {
    assert.deepEqual(parseMessage(input).businessPeriods, ["month"]);
  }
  assert.deepEqual(parseMessage("КПН 5 млн за квартал").businessPeriods, ["quarter"]);
  assert.deepEqual(parseMessage("Выручка 120 млн за 2025 год").businessPeriods, ["year"]);
});

test("monthly lease budget never changes the period of an annual tax amount", () => {
  assert.deepEqual(parseMessage("Плачу 20 млн налогов, на лизинг 500 тысяч в месяц"), {
    action: "business_finance",
    businessPeriods: ["year"],
  });
  assert.deepEqual(parseMessage("Налоги 20 млн в год, доход 10 млн в месяц").businessPeriods, [
    "year",
    "month",
  ]);
});

test("default reporting year does not change ordinary monthly budgets and lease terms", () => {
  assert.deepEqual(parseMessage("Плачу до 300 тысяч, аванс 2 млн, срок 4 года"), {
    action: "calculate",
    maxMonthly: 300_000,
    maxAdvance: 2_000_000,
    months: 48,
  });
});
