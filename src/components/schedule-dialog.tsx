"use client";

import { Download, Info } from "lucide-react";
import { buildSchedule } from "@/lib/finance";
import { moneyPrecise, percent } from "@/lib/format";
import type { Quote } from "@/lib/types";
import { Dialog } from "./dialog";

export function ScheduleDialog({
  quote,
  model,
  onClose,
}: {
  quote: Quote;
  model: string;
  onClose: () => void;
}) {
  const rows = buildSchedule(quote);
  function download() {
    const csv = [
      ["Месяц", "Платеж, ₸", "Основной долг, ₸", "Проценты, ₸", "Остаток, ₸"].join(";"),
      ...rows.map((row) =>
        [row.month, row.payment, row.principal, row.interest, row.balance]
          .map((value) => String(value).replace(".", ","))
          .join(";"),
      ),
    ].join("\r\n");
    const url = URL.createObjectURL(
      new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" }),
    );
    const link = document.createElement("a");
    link.href = url;
    link.download = "bcc-leasing-payment-schedule.csv";
    link.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }
  return (
    <Dialog title="График платежей" onClose={onClose} wide>
      <p className="dialog-intro">
        {model} · {quote.rate.months} месяцев · {percent(quote.rate.annualRate)}% годовых
      </p>
      <div className="schedule-stats">
        <div>
          <span>Финансирование</span>
          <strong>{moneyPrecise(quote.principal)}</strong>
        </div>
        <div>
          <span>Проценты за срок</span>
          <strong>{moneyPrecise(quote.totalInterest)}</strong>
        </div>
        <div>
          <span>Выплаты с авансом</span>
          <strong>{moneyPrecise(quote.totalWithAdvance)}</strong>
        </div>
      </div>
      <div className="table-scroll" tabIndex={0} aria-label="Таблица ежемесячных платежей">
        <table>
          <thead>
            <tr>
              <th>Месяц</th>
              <th>Платеж</th>
              <th>Основной долг</th>
              <th>Проценты</th>
              <th>Остаток</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.month}>
                <td>{row.month}</td>
                <td>{moneyPrecise(row.payment)}</td>
                <td>{moneyPrecise(row.principal)}</td>
                <td>{moneyPrecise(row.interest)}</td>
                <td>{moneyPrecise(row.balance)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="schedule-footer">
        <p className="hint">
          <Info size={15} /> Предварительный график, без дополнительных расходов. Последний платеж
          корректируется по остатку долга.
        </p>
        <button className="secondary-button" onClick={download}>
          <Download size={17} />
          Скачать CSV
        </button>
      </div>
    </Dialog>
  );
}
