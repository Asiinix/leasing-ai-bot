import assert from "node:assert/strict";
import test from "node:test";
import {
  advanceBusinessBudget,
  calculateBusinessBudget,
  type BusinessBudgetState,
} from "../src/features/business-budget/conversation.ts";
import { BUSINESS_BUDGET_EXAMPLE } from "../src/features/business-budget/prompts.ts";

function conversation(messages: string[]) {
  let state: BusinessBudgetState | null = null;
  let turn;
  for (const message of messages) {
    turn = advanceBusinessBudget(message, state);
    assert.ok(turn, message);
    state = turn.state;
  }
  return turn!;
}

const example = ["20 миллионов налогов", "Выручка 120 млн, расходы 76 млн", "нет"];

test("the displayed complete example immediately produces a vehicle-search budget", () => {
  const result = advanceBusinessBudget(BUSINESS_BUDGET_EXAMPLE, null)!;
  assert.equal(result.state!.step, "complete");
  assert.deepEqual(result.budget, { maxMonthly: 500_000, maxAdvance: 3_000_000 });
  assert.doesNotMatch(result.reply, /Сколько готовы|Какая у вас|Укажите расходы/);
});

test("the first tax-only reply offers all-at-once intake and partial follow-ups preserve it", () => {
  const started = advanceBusinessBudget("20 млн налогов", null)!;
  assert.ok(started.reply.includes(BUSINESS_BUDGET_EXAMPLE));
  assert.match(started.reply, /по шагам/);
  const next = advanceBusinessBudget(
    "Аванс 3 млн, обязательств нет, выручка 120 млн",
    started.state,
  )!;
  assert.equal(next.state!.step, "expenses");
  assert.ok(!next.reply.includes(BUSINESS_BUDGET_EXAMPLE));
  assert.deepEqual(advanceBusinessBudget("Расходы 76 млн", next.state)!.budget, {
    maxMonthly: 500_000,
    maxAdvance: 3_000_000,
  });
});

test("tax-based conversation calculates 2m monthly surplus, 1.5m reserve, 500k lease budget", () => {
  const beforeAdvance = conversation(example);
  assert.equal(beforeAdvance.state!.step, "advance");
  assert.equal(beforeAdvance.budget, undefined);
  assert.deepEqual(calculateBusinessBudget(beforeAdvance.state!), {
    annualSurplus: 24_000_000,
    monthlySurplus: 2_000_000,
    reserve: 1_500_000,
    maxMonthly: 500_000,
  });
  const ready = advanceBusinessBudget("Аванс 3 млн", beforeAdvance.state)!;
  assert.deepEqual(ready.budget, { maxMonthly: 500_000, maxAdvance: 3_000_000 });
  assert.match(ready.reply, /75%/);
});

test("tax wording and number words work for voice transcripts with annual default", () => {
  for (const text of [
    "Плачу 20 миллионов налогов",
    "Заплатил за год двадцать миллионов тенге налогов",
    "Налогов 20 млн",
  ]) {
    const result = advanceBusinessBudget(text, null)!;
    assert.equal(result.state!.values.taxes, 20_000_000);
    assert.equal(result.state!.step, "revenue");
    assert.equal(result.budget, undefined);
  }
});

test("uses explicit monthly or quarterly reporting periods and never divides annual values twice", () => {
  const result = conversation([
    "Налоги 5 млн за квартал",
    "Выручка 10 млн в месяц, расходы 76 млн за год",
    "500 тысяч в месяц",
    "Аванс 3 млн",
  ]);
  assert.equal(result.state!.values.taxes, 20_000_000);
  assert.equal(result.state!.values.revenue, 120_000_000);
  assert.equal(result.state!.values.obligations, 6_000_000);
  assert.deepEqual(result.budget, { maxMonthly: 375_000, maxAdvance: 3_000_000 });
});

test("prompts for obligations and does not infer them as zero", () => {
  const result = conversation(example.slice(0, 2));
  assert.equal(result.state!.step, "obligations");
  assert.equal(result.state!.values.obligations, undefined);
  assert.equal(result.budget, undefined);
});

test("supports bare answers and zero annual tax and obligations", () => {
  const result = conversation(["Подбор по налогам", "0", "120 млн", "76 млн", "0", "3 млн"]);
  assert.equal(result.state!.values.taxes, 0);
  assert.equal(result.state!.values.expenses, 76_000_000);
  assert.ok(result.budget);
});

test("adjustable monthly reserve recomputes the matching budget", () => {
  const result = conversation([...example, "Резерв 1 млн в месяц, аванс 3 млн"]);
  assert.deepEqual(result.budget, { maxMonthly: 1_000_000, maxAdvance: 3_000_000 });
  const annual = advanceBusinessBudget("Резерв 18 млн в год", result.state)!;
  assert.deepEqual(annual.budget, { maxMonthly: 500_000, maxAdvance: 3_000_000 });
});

test("already included taxes and credit payments are not deducted a second time", () => {
  const result = conversation([
    "Налоги 20 млн",
    "Выручка 120 млн, расходы 96 млн включая налоги",
    "Обязательств нет",
    "Аванс 3 млн",
  ]);
  assert.equal(result.budget!.maxMonthly, 500_000);
  const both = conversation([
    "Налоги 20 млн",
    "Выручка 120 млн, расходы 96 млн включая налоги и кредиты",
    "Обязательства 6 млн",
    "Аванс 3 млн",
  ]);
  assert.equal(both.budget!.maxMonthly, 500_000);
});

test("deficit or reserve consuming all surplus cannot trigger vehicle search", () => {
  const deficit = conversation(["Налоги 20 млн", "Выручка 50 млн, расходы 76 млн", "нет"]);
  assert.equal(deficit.budget, undefined);
  assert.match(deficit.reply, /нет положительного/);
  const noRoom = conversation([...example, "Резерв 2 млн, аванс 3 млн"]);
  assert.equal(noRoom.budget, undefined);
  assert.equal(noRoom.state!.step, "reserve");
  assert.ok(advanceBusinessBudget("1 млн", noRoom.state)!.budget);
});

test("no advance is not replaced by the currently selected calculator advance", () => {
  const result = conversation([...example, "Без аванса"]);
  assert.equal(result.budget, undefined);
  assert.equal(result.state!.step, "advance");
});

test("ambiguous units keep the exact field being clarified", () => {
  const result = conversation(["Налоги 20 млн", "Выручка 120"]);
  assert.match(result.reply, /единицы/);
  const corrected = advanceBusinessBudget("120 млн", result.state)!;
  assert.equal(corrected.state!.values.revenue, 120_000_000);
  assert.equal(corrected.state!.values.taxes, 20_000_000);
});

test("rejects negative, foreign currency, percentage and excessive amounts without applying values", () => {
  for (const text of [
    "Налоги -20 млн",
    "Налоги 20 млн долларов",
    "Налоги 20%",
    "Налоги 999999999999999999 млн",
  ]) {
    const result = advanceBusinessBudget(text, null)!;
    assert.equal(result.state!.values.taxes, undefined, text);
    assert.equal(result.budget, undefined);
  }
});

test("allows all labelled figures in one message", () => {
  const result = advanceBusinessBudget(
    "Налоги 20 млн, выручка 120 млн, расходы 76 млн, обязательств нет, аванс 3 млн",
    null,
  )!;
  assert.deepEqual(result.budget, { maxMonthly: 500_000, maxAdvance: 3_000_000 });
});

test("more vehicles and standard lease messages pass through after business calculation", () => {
  const ready = conversation([...example, "Аванс 3 млн"]);
  assert.equal(advanceBusinessBudget("Ещё варианты", ready.state), null);
  assert.equal(advanceBusinessBudget("Платёж до 300 тысяч, аванс 2 млн", ready.state), null);
  assert.equal(advanceBusinessBudget("До 300 тысяч в месяц, аванс 2 млн", null), null);
  assert.equal(advanceBusinessBudget("Отмена", ready.state)!.state, null);
});

test("updating business figures invalidates the previous capacity estimate", () => {
  const ready = conversation([...example, "Аванс 3 млн"]);
  const corrected = advanceBusinessBudget("Выручка 108 млн", ready.state)!;
  assert.deepEqual(corrected.budget, { maxMonthly: 250_000, maxAdvance: 3_000_000 });
});

test("does not interpret a calendar year as money", () => {
  assert.equal(
    advanceBusinessBudget("Налоги за 2025 год 20 млн", null)!.state!.values.taxes,
    20_000_000,
  );
  assert.equal(
    advanceBusinessBudget("Налоги 20 млн за 6 месяцев", null)!.state!.values.taxes,
    undefined,
  );
});

test("reported profit cannot be silently stored as paid taxes", () => {
  const result = advanceBusinessBudget("Прибыль 20 млн", null)!;
  assert.equal(result.state!.values.taxes, undefined);
  assert.match(result.reply, /Прибыль не буду принимать/);
});
