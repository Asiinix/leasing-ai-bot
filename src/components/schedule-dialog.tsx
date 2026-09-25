"use client";

import { Button, Card, Flex, Grid, TableV2, Typography, type ColumnV2 } from "bcc-design";
import Download from "bcc-design-icons/base/Arrows/Download";
import InfoOutlined from "bcc-design-icons/base/Basic/InfoOutlined";
import { buildSchedule } from "@/lib/finance";
import { moneyPrecise, percent } from "@/lib/format";
import type { Quote } from "@/lib/types";
import { Dialog } from "./dialog";
import s from "./schedule-dialog.module.scss";

const columns: ColumnV2[] = [
  { id: "month", accessorKey: "month", type: "basic", title: "Месяц", disableSort: true },
  { id: "payment", accessorKey: "payment", type: "basic", title: "Платеж", disableSort: true },
  {
    id: "principal",
    accessorKey: "principal",
    type: "basic",
    title: "Основной долг",
    disableSort: true,
  },
  { id: "interest", accessorKey: "interest", type: "basic", title: "Проценты", disableSort: true },
  { id: "balance", accessorKey: "balance", type: "basic", title: "Остаток", disableSort: true },
];

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
  // Ячейка amount форматирует суммы сама и без фиксированных двух знаков,
  // поэтому суммы передаем готовыми строками в basic-ячейку.
  const data = rows.map((row) => ({
    id: String(row.month),
    month: { title: String(row.month) },
    payment: { title: moneyPrecise(row.payment) },
    principal: { title: moneyPrecise(row.principal) },
    interest: { title: moneyPrecise(row.interest) },
    balance: { title: moneyPrecise(row.balance) },
  }));
  function download() {
    const csv = [
      ["Месяц", "Платеж, ₸", "Основной долг, ₸", "Проценты, ₸", "Остаток, ₸"].join(";"),
      ...rows.map((row) =>
        [row.month, row.payment, row.principal, row.interest, row.balance]
          .map((value) => String(value).replace(".", ","))
          .join(";"),
      ),
    ].join("\r\n");
    const url = URL.createObjectURL(new Blob(["﻿" + csv], { type: "text/csv;charset=utf-8;" }));
    const link = document.createElement("a");
    link.href = url;
    link.download = "bcc-leasing-payment-schedule.csv";
    link.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }
  return (
    <Dialog
      title="График платежей"
      description={`${model}, ${quote.rate.months} месяцев, ${percent(quote.rate.annualRate)}% годовых`}
      onClose={onClose}
      wide
      footer={
        <Flex gap={16} alignItems="center" justifyContent="space-between" wrap="wrap">
          <Flex gap={8} alignItems="flex-start" className={s.note}>
            <InfoOutlined width={16} height={16} className={s.noteIcon} />
            <Typography.Caption view="large" color="secondary">
              Предварительный график, без дополнительных расходов. Последний платеж корректируется
              по остатку долга.
            </Typography.Caption>
          </Flex>
          <Button view="accentSecondary" size="m" iconLeft={<Download />} onClick={download}>
            Скачать CSV
          </Button>
        </Flex>
      }
    >
      <Flex direction="column" gap={24}>
        <Grid.Row gap={12}>
          <Grid.Col span={{ xxs: 24, xs: 8 }}>
            <Stat label="Финансирование" value={moneyPrecise(quote.principal)} />
          </Grid.Col>
          <Grid.Col span={{ xxs: 24, xs: 8 }}>
            <Stat label="Проценты за срок" value={moneyPrecise(quote.totalInterest)} />
          </Grid.Col>
          <Grid.Col span={{ xxs: 24, xs: 8 }}>
            <Stat label="Выплаты с авансом" value={moneyPrecise(quote.totalWithAdvance)} />
          </Grid.Col>
        </Grid.Row>
        <TableV2
          aria-label="Таблица ежемесячных платежей"
          columns={columns}
          data={data}
          disablePagination
          disableRowsCount
          maxHeight="50vh"
        />
      </Flex>
    </Dialog>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <Card size="s" type="secondary">
      <Flex direction="column" gap={4}>
        <Typography.Caption view="large" color="secondary">
          {label}
        </Typography.Caption>
        <Typography.Paragraph view="large" weight="semibold" monospaceNumbers>
          {value}
        </Typography.Paragraph>
      </Flex>
    </Card>
  );
}
