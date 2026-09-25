import assert from "node:assert/strict";
import test from "node:test";
import { calculateQuote, buildSchedule } from "../src/lib/finance";
import { createProposal } from "../src/lib/proposal";
import { money, moneyPrecise } from "../src/lib/format";

test("proposal retains calculator rounding, exact totals and all schedule rows", () => {
  for (const months of [1, 48, 60, 120]) {
    const quote = calculateQuote(15000000, {
      modelId: 1,
      rateId: 1,
      months,
      advancePercent: 20,
      annualRate: 24.5,
    });
    const proposal = createProposal(
      quote,
      "Модель",
      "TOO",
      "   ",
      new Date("2026-09-25T20:30:00Z"),
    );
    assert.equal(proposal.filename, "Коммерческое_предложение_2026-09-26.pdf");
    assert.equal(proposal.date, "26.09.2026");
    const fields = Object.fromEntries(proposal.fields);
    assert.equal(fields["Клиент"], undefined);
    assert.equal(fields["Ежемесячный платеж"], money(quote.monthlyPayment));
    assert.equal(fields["Выплаты с авансом"], moneyPrecise(quote.totalWithAdvance));
    assert.deepEqual(
      proposal.schedule,
      buildSchedule(quote).map((row) => [
        String(row.month),
        moneyPrecise(row.payment),
        moneyPrecise(row.principal),
        moneyPrecise(row.interest),
        moneyPrecise(row.balance),
      ]),
    );
  }
});
