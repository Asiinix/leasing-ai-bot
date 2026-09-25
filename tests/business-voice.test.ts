import assert from "node:assert/strict";
import test from "node:test";
import { advanceBusinessBudget } from "../src/features/business-budget/conversation.ts";

test("a trailing monthly adverb stays with its own amount", () => {
  const turn = advanceBusinessBudget(
    "Налоги 1 млн ежемесячно выручка 120 млн расходы 84 млн обязательств нет аванс 3 млн",
    null,
  )!;
  assert.equal(turn.state!.values.taxes, 12_000_000);
  assert.equal(turn.state!.values.revenue, 120_000_000);
  assert.deepEqual(turn.budget, { maxMonthly: 500_000, maxAdvance: 3_000_000 });
});

test("unpunctuated monthly reserve does not change annual business figures", () => {
  const turn = advanceBusinessBudget(
    "Налоги 20 млн выручка 120 млн расходы 70 млн обязательства 6 млн резерв полтора миллиона в месяц аванс 3 млн",
    null,
  )!;
  assert.deepEqual(turn.state!.values, {
    taxes: 20_000_000,
    revenue: 120_000_000,
    expenses: 70_000_000,
    obligations: 6_000_000,
    reserve: 1_500_000,
    advance: 3_000_000,
  });
  assert.deepEqual(turn.budget, { maxMonthly: 500_000, maxAdvance: 3_000_000 });
});

test("mixed annual and monthly figures can be dictated without punctuation", () => {
  const turn = advanceBusinessBudget(
    "Налоги 20 млн за год выручка 120 млн за год расходы 6 млн в месяц обязательства 4 млн за год аванс 3 млн",
    null,
  )!;
  assert.equal(turn.state!.values.expenses, 72_000_000);
  assert.equal(turn.state!.values.obligations, 4_000_000);
  assert.deepEqual(turn.budget, { maxMonthly: 500_000, maxAdvance: 3_000_000 });
});

test("monthly credit payments apply only to obligations in a voice transcript", () => {
  const turn = advanceBusinessBudget(
    "Налоги 20 млн выручка 120 млн расходы 70 млн кредиты 500 тысяч в месяц аванс 3 млн",
    null,
  )!;
  assert.equal(turn.state!.values.taxes, 20_000_000);
  assert.equal(turn.state!.values.obligations, 6_000_000);
  assert.deepEqual(turn.budget, { maxMonthly: 500_000, maxAdvance: 3_000_000 });
});

test("number-first spoken figures do not reuse the previous field marker", () => {
  const turn = advanceBusinessBudget(
    "20 миллионов налогов 120 миллионов выручки 70 миллионов расходов 6 миллионов обязательств 3 миллиона аванс",
    null,
  )!;
  assert.deepEqual(turn.budget, { maxMonthly: 500_000, maxAdvance: 3_000_000 });
});

test("expense exclusions cannot overwrite declared obligations", () => {
  for (const separator of [", ", " "]) {
    const turn = advanceBusinessBudget(
      [
        "Налоги 20 млн",
        "выручка 120 млн",
        "расходы 70 млн без кредитов",
        "обязательства 6 млн",
        "аванс 3 млн",
      ].join(separator),
      null,
    )!;
    assert.equal(turn.state!.values.obligations, 6_000_000, separator);
    assert.deepEqual(turn.budget, { maxMonthly: 500_000, maxAdvance: 3_000_000 });
  }
});

test("expenses without credit payments still require the obligations amount", () => {
  const turn = advanceBusinessBudget(
    "Налоги 20 млн, выручка 120 млн, расходы 70 млн без кредитов, аванс 3 млн",
    null,
  )!;
  assert.equal(turn.state!.values.obligations, undefined);
  assert.equal(turn.state!.step, "obligations");
  assert.equal(turn.budget, undefined);
});

test("contradictory zero and nonzero obligations prompt for clarification", () => {
  for (const details of [
    "обязательства 6 млн, кредитов нет",
    "кредитов нет, обязательства 6 млн",
    "обязательства 6 млн кредитов нет",
  ]) {
    const turn = advanceBusinessBudget(
      `Налоги 20 млн, выручка 120 млн, расходы 70 млн, ${details}, аванс 3 млн`,
      null,
    )!;
    assert.equal(turn.budget, undefined, details);
    assert.equal(turn.state!.step, "obligations", details);
    assert.match(turn.reply, /Уточните.*итоговую сумму/, details);
  }
});

test("an explicit absence of obligations still completes an unpunctuated intake", () => {
  const turn = advanceBusinessBudget(
    "Налоги 20 млн выручка 120 млн расходы 76 млн обязательств нет аванс 3 млн",
    null,
  )!;
  assert.deepEqual(turn.budget, { maxMonthly: 500_000, maxAdvance: 3_000_000 });
});

test("period adjectives stay with the following field in unpunctuated speech", () => {
  for (const text of [
    "Налоги 20 млн ежемесячная выручка 10 млн расходы 76 млн обязательств нет аванс 3 млн",
    "Налоги 20 млн выручка 120 млн квартальные расходы 19 млн обязательств нет аванс 3 млн",
    "Налоги 1 млн в месяц годовая выручка 120 млн расходы 84 млн обязательств нет аванс 3 млн",
  ]) {
    const turn = advanceBusinessBudget(text, null)!;
    assert.equal(turn.state!.values.revenue, 120_000_000, text);
    assert.deepEqual(turn.budget, { maxMonthly: 500_000, maxAdvance: 3_000_000 }, text);
  }
});

test("a monthly suffix remains attached to the preceding amount", () => {
  const turn = advanceBusinessBudget(
    "Налоги 20 млн выручка 10 млн в месяц расходы 76 млн обязательств нет аванс 3 млн",
    null,
  )!;
  assert.equal(turn.state!.values.taxes, 20_000_000);
  assert.equal(turn.state!.values.revenue, 120_000_000);
  assert.equal(turn.state!.values.expenses, 76_000_000);
  assert.deepEqual(turn.budget, { maxMonthly: 500_000, maxAdvance: 3_000_000 });
});
