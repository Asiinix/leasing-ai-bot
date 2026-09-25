"use client";

import { useId, useMemo, useState } from "react";
import { Card, Input, Select, Tooltip, Typography } from "bcc-design";
import { Info, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui";
import { money, moneyPrecise, number, percent } from "@/lib/format";
import {
  calculateOsrns,
  findOsrnsTariff,
  MAX_ANNUAL_PAYROLL,
  OSRNS_MINIMUM,
  OSRNS_TARIFFS,
  type OsrnsInput,
} from "./calculate";

function FieldHelp({ label, explanation }: { label: string; explanation: string }) {
  const id = useId();
  return (
    <Tooltip id={id} position="top" content={explanation}>
      <Button
        view="ghost"
        size="s"
        className="osrns-help"
        aria-label={`Что такое ${label}?`}
        aria-describedby={id}
      >
        <Info size={17} aria-hidden="true" />
      </Button>
    </Tooltip>
  );
}

export function OsrnsPanel({
  value,
  onChange,
}: {
  value: OsrnsInput;
  onChange: (value: OsrnsInput) => void;
}) {
  const okedId = useId();
  const payrollId = useId();
  const [search, setSearch] = useState("");
  const [payrollError, setPayrollError] = useState(false);
  const tariff = findOsrnsTariff(value.oked);
  const result = calculateOsrns(value);
  const options = useMemo(() => {
    const query = search.trim().toLocaleLowerCase();
    const codeQuery = query.replace(/[.\s]/g, "");
    return OSRNS_TARIFFS.filter(
      (entry) =>
        !query ||
        entry.code.includes(codeQuery) ||
        entry.name.toLocaleLowerCase().includes(query) ||
        entry.nameKz.toLocaleLowerCase().includes(query),
    ).map((entry) => ({
      value: entry.code,
      label: `${entry.code} · ${entry.name}`,
      hint: `${percent(entry.rateBasisPoints / 100)}% · класс риска ${entry.riskClass}`,
    }));
  }, [search]);
  return (
    <section className="osrns-panel panel" aria-labelledby="osrns-heading">
      <Card height="auto">
        <div className="panel-heading osrns-heading">
          <div>
            <Typography.Title tag="h2" id="osrns-heading">
              ОСРНС
            </Typography.Title>
            <p>Обязательное страхование работника от несчастных случаев</p>
          </div>
          <span className="summary-icon">
            <ShieldCheck size={21} />
          </span>
        </div>
        <div className="osrns-layout">
          <div className="osrns-fields">
            <div className="osrns-field">
              <div className="osrns-field-label">
                <label className="field-label" htmlFor={okedId}>
                  ОКЭД
                </label>
                <FieldHelp
                  label="ОКЭД"
                  explanation="ОКЭД — Общий классификатор видов экономической деятельности. Выберите код основного вида деятельности компании: по нему определяется страховой тариф."
                />
              </div>
              <Select
                id={okedId}
                aria-label="ОКЭД"
                fullWidth
                allowSearch
                clear
                filterOptions={false}
                value={value.oked || null}
                options={options}
                onSearch={setSearch}
                optionsWrap={{ label: "wrap", hint: "wrap" }}
                placeholder="Введите код или название деятельности"
                onChange={({ value: code }) => {
                  onChange({ ...value, oked: typeof code === "string" ? code : "" });
                  setSearch("");
                }}
              />
              {tariff ? (
                <div className="osrns-selected">
                  <p>{tariff.name}</p>
                  <span>
                    Класс риска {tariff.riskClass} · тариф {percent(tariff.rateBasisPoints / 100)}%
                  </span>
                </div>
              ) : (
                <p className="field-hint">Поиск по коду и названию деятельности</p>
              )}
            </div>
            <div className="osrns-field">
              <div className="osrns-field-label">
                <label className="field-label" htmlFor={payrollId}>
                  ГФОТ
                </label>
                <FieldHelp
                  label="ГФОТ"
                  explanation="ГФОТ — годовой фонд оплаты труда: общая сумма начисленной заработной платы работников за 12 месяцев. Укажите сумму в тенге, чтобы рассчитать стоимость страхования."
                />
              </div>
              <Input
                id={payrollId}
                aria-label="ГФОТ"
                fullWidth
                type="text"
                inputMode="numeric"
                autoComplete="off"
                placeholder="Введите годовой фонд оплаты труда"
                value={value.annualPayroll ? number(value.annualPayroll) : ""}
                rightAddon={<span className="money-suffix">₸</span>}
                error={payrollError}
                onChange={(event) => {
                  const raw = event.target.value.replace(/[\s\u00a0\u202f]/g, "");
                  if (!/^\d*$/.test(raw)) return;
                  const amount = Number(raw);
                  if (!Number.isSafeInteger(amount) || amount > MAX_ANNUAL_PAYROLL) {
                    setPayrollError(true);
                    return;
                  }
                  setPayrollError(false);
                  onChange({ ...value, annualPayroll: amount });
                }}
              />
              <p className="field-hint" role={payrollError ? "alert" : undefined}>
                {payrollError
                  ? "Сумма слишком большая. Укажите меньшую сумму."
                  : "Общая сумма начисленной зарплаты за 12 месяцев"}
              </p>
            </div>
          </div>
          <div
            className={`osrns-result${result ? " is-calculated" : ""}`}
            aria-live="polite"
            aria-atomic="true"
          >
            <span className="osrns-result-label">Стоимость ОСРНС за год</span>
            {result ? (
              <>
                <strong data-testid="osrns-premium">{money(result.annualPremium)}</strong>
                <p className="osrns-formula">
                  {money(result.annualPayroll)} × {percent(result.ratePercent)}% ={" "}
                  {moneyPrecise(result.calculatedPremium)}
                </p>
                {result.minimumApplied && (
                  <p className="osrns-minimum">
                    Применена минимальная стоимость — {money(OSRNS_MINIMUM)}
                  </p>
                )}
                <p className="osrns-result-note">
                  <ShieldCheck size={16} /> Расчёт будет добавлен в КП
                </p>
              </>
            ) : (
              <>
                <strong className="osrns-empty-amount">от {money(OSRNS_MINIMUM)}</strong>
                <p className="osrns-formula">
                  Выберите ОКЭД и укажите ГФОТ, чтобы рассчитать стоимость.
                </p>
              </>
            )}
            <p className="osrns-separate">Оплачивается отдельно от лизинга и КАСКО.</p>
          </div>
        </div>
      </Card>
    </section>
  );
}
