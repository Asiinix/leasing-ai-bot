"use client";

import { useEffect, useState } from "react";
import {
  Alert,
  Button,
  Checkbox,
  Chip,
  Divider,
  Flex,
  Input,
  ProgressCircle,
  Spinner,
  Tag,
  Typography,
} from "bcc-design";
import ArrowDirectionRight from "bcc-design-icons/base/Arrows/ArrowDirectionRight";
import CheckOutlinedBold from "bcc-design-icons/base/Basic/CheckOutlinedBold";
import { money, percent } from "@/lib/format";
import {
  businessAgeOptions,
  emptyScoringForm,
  formCompletion,
  scoreApplication,
  scoringStages,
  type Decision,
  type ScoringForm,
  type ScoringResult,
} from "@/lib/scoring";
import type { ClientType, Quote } from "@/lib/types";
import { Dialog } from "./dialog";
import { MoneyInput } from "./money-input";
import s from "./scoring-dialog.module.scss";

// Длительность одного этапа симуляции. Весь скоринг — около 5 секунд.
const STAGE_MS = 1000;
const TICK_MS = 50;

const decisionText: Record<Decision, { title: string; detail: string }> = {
  approved: {
    title: "Предварительно одобрено",
    detail:
      "Продолжите оформление в сервисе BCC Leasing. Окончательное решение банк примет после проверки документов.",
  },
  review: {
    title: "Нужна дополнительная проверка",
    detail:
      "Продолжите оформление, менеджер уточнит данные. Увеличьте аванс или срок, чтобы повысить шансы.",
  },
  declined: {
    title: "Сейчас одобрение маловероятно",
    detail:
      "Заявка сохранена, но попробуйте снизить платеж: увеличьте аванс или срок лизинга, либо выберите модель дешевле.",
  },
};

type Phase = "form" | "running" | "result";

export function ScoringDialog({
  quote,
  model,
  clientType,
  applicationId,
  continueUrl,
  initialTaxId = "",
  onClose,
}: {
  quote: Quote;
  model: string;
  clientType: ClientType;
  applicationId: string;
  continueUrl: string;
  initialTaxId?: string;
  onClose: () => void;
}) {
  const [form, setForm] = useState<ScoringForm>({ ...emptyScoringForm, taxId: initialTaxId });
  const [phase, setPhase] = useState<Phase>("form");
  const [progress, setProgress] = useState(0);
  const [result, setResult] = useState<ScoringResult | null>(null);
  const completion = formCompletion(form);
  const taxIdLabel = clientType === "IP" ? "ИИН" : "БИН";

  useEffect(() => {
    if (phase !== "running") return;
    const step = (100 * TICK_MS) / (STAGE_MS * scoringStages.length);
    const timer = setInterval(() => {
      setProgress((current) => Math.min(100, current + step));
    }, TICK_MS);
    return () => clearInterval(timer);
  }, [phase]);

  useEffect(() => {
    if (phase !== "running" || progress < 100) return;
    const timer = setTimeout(() => {
      setResult(
        scoreApplication(form, {
          clientType,
          monthlyPayment: quote.monthlyPayment,
          advancePercent: quote.rate.advancePercent,
        }),
      );
      setPhase("result");
    }, 300);
    return () => clearTimeout(timer);
  }, [phase, progress, form, clientType, quote]);

  function change(patch: Partial<ScoringForm>) {
    setForm((current) => ({ ...current, ...patch }));
  }
  function start() {
    setProgress(0);
    setResult(null);
    setPhase("running");
  }

  const footer =
    phase === "form" ? (
      <Flex direction="column" gap={8}>
        <Button view="accentPrimary" size="l" fullWidth disabled={completion < 100} onClick={start}>
          Запустить скоринг
        </Button>
        <Button view="neutral" size="l" fullWidth onClick={onClose}>
          Пропустить
        </Button>
      </Flex>
    ) : phase === "result" && result ? (
      <Flex direction="column" gap={8}>
        {result.decision !== "declined" && (
          // Обход дефекта DS: Button с href рендерит <a> без самого href.
          <Button
            view="accentPrimary"
            size="l"
            fullWidth
            iconRight={<ArrowDirectionRight />}
            onClick={() => window.open(continueUrl, "_blank", "noopener,noreferrer")}
          >
            Продолжить в сервисе BCC Leasing
          </Button>
        )}
        <Button
          view={result.decision === "declined" ? "accentPrimary" : "neutral"}
          size="l"
          fullWidth
          onClick={onClose}
        >
          {result.decision === "declined" ? "Изменить условия расчета" : "Готово"}
        </Button>
      </Flex>
    ) : undefined;

  return (
    <Dialog
      title="Предварительный скоринг"
      description={`Заявка ${applicationId} сохранена · ${model}, ${money(quote.monthlyPayment)} в месяц на ${quote.rate.months} мес.`}
      onClose={onClose}
      footer={footer}
    >
      {phase === "form" && (
        <Flex direction="column" gap={24}>
          {/* Круг заполняется по мере ответов клиента: каждый пункт анкеты — 20%. */}
          <Flex gap={16} alignItems="center" className={s.summary}>
            <ProgressCircle
              size="m"
              percent={completion}
              role="progressbar"
              aria-valuemin={0}
              aria-valuemax={100}
              aria-valuenow={completion}
              aria-label="Заполнение анкеты"
            />
            <Flex direction="column" gap={4}>
              <Typography.Paragraph view="medium" weight="semibold">
                {completion < 100 ? `Анкета заполнена на ${completion}%` : "Анкета заполнена"}
              </Typography.Paragraph>
              <Typography.Caption view="large" color="secondary">
                {completion < 100
                  ? "Ответьте на все вопросы, чтобы запустить скоринг"
                  : "Можно запускать скоринг"}
              </Typography.Caption>
            </Flex>
          </Flex>

          <Input
            fullWidth
            size="lg"
            label={taxIdLabel}
            inputMode="numeric"
            autoComplete="off"
            placeholder="12 цифр"
            value={form.taxId}
            hint={clientType === "IP" ? "ИИН индивидуального предпринимателя" : "БИН организации"}
            onChange={(_, payload) =>
              change({ taxId: payload.value.replace(/\D/g, "").slice(0, 12) })
            }
          />

          <Flex direction="column" gap={8}>
            <Typography.Paragraph view="small" color="secondary" id="business-age-label">
              Срок деятельности бизнеса
            </Typography.Paragraph>
            <Flex wrap role="group" aria-labelledby="business-age-label">
              {businessAgeOptions.map((option) => (
                <Chip
                  key={option.value}
                  clickable
                  variant={form.businessAge === option.value ? "active" : "inactive"}
                  aria-pressed={form.businessAge === option.value}
                  onClick={() => change({ businessAge: option.value })}
                >
                  {option.label}
                </Chip>
              ))}
            </Flex>
          </Flex>

          <MoneyInput
            label="Средняя выручка в месяц"
            value={form.monthlyRevenue}
            placeholder="Укажите сумму"
            hint="За последние 6 месяцев"
            onChange={(monthlyRevenue) => change({ monthlyRevenue })}
          />

          <Flex direction="column" gap={8}>
            <Typography.Paragraph view="small" color="secondary" id="debt-label">
              Есть действующие кредиты или лизинг?
            </Typography.Paragraph>
            <Flex wrap role="group" aria-labelledby="debt-label">
              {[
                { value: false, label: "Нет" },
                { value: true, label: "Есть" },
              ].map((option) => (
                <Chip
                  key={option.label}
                  clickable
                  variant={form.hasDebt === option.value ? "active" : "inactive"}
                  aria-pressed={form.hasDebt === option.value}
                  onClick={() => change({ hasDebt: option.value })}
                >
                  {option.label}
                </Chip>
              ))}
            </Flex>
          </Flex>
          {form.hasDebt && (
            <MoneyInput
              label="Платежи по ним в месяц"
              value={form.monthlyDebt}
              placeholder="Укажите сумму"
              onChange={(monthlyDebt) => change({ monthlyDebt })}
            />
          )}

          <Checkbox
            checked={form.consent}
            label="Согласен на запрос данных в кредитное бюро и госбазы"
            onChange={(_, payload) => change({ consent: payload.checked })}
          />
        </Flex>
      )}

      {phase === "running" && (
        <Flex direction="column" gap={24} alignItems="center" aria-live="polite">
          <ProgressCircle
            size="l"
            percent={Math.floor(progress)}
            role="progressbar"
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={Math.floor(progress)}
            aria-label="Скоринг"
          />
          <ol className={s.stages}>
            {scoringStages.map((stage, index) => {
              const share = 100 / scoringStages.length;
              const state =
                progress >= (index + 1) * share
                  ? "done"
                  : progress >= index * share
                    ? "active"
                    : "pending";
              return (
                <li key={stage} className={s.stage} data-state={state}>
                  <span className={s.stageIcon} aria-hidden>
                    {state === "done" ? (
                      <CheckOutlinedBold width={16} height={16} />
                    ) : state === "active" ? (
                      <Spinner size="xs" />
                    ) : null}
                  </span>
                  <Typography.Paragraph
                    view="small"
                    color={state === "pending" ? "secondary" : undefined}
                    weight={state === "active" ? "medium" : undefined}
                  >
                    {stage}
                  </Typography.Paragraph>
                </li>
              );
            })}
          </ol>
        </Flex>
      )}

      {phase === "result" && result && (
        <Flex direction="column" gap={24}>
          <Flex gap={16} alignItems="center" className={s.summary}>
            <ProgressCircle
              size="l"
              percent={result.score}
              success={result.decision === "approved"}
              error={result.decision === "declined"}
              aria-label={`Скоринговый балл ${result.score} из 100`}
            />
            <Flex direction="column" gap={4}>
              <Typography.Title tag="div" view="block" role="heading" aria-level={3}>
                {decisionText[result.decision].title}
              </Typography.Title>
              <Typography.Paragraph view="small" color="secondary">
                Балл {result.score} из 100 · нагрузка{" "}
                {Number.isFinite(result.debtLoad)
                  ? `${percent(Math.round(result.debtLoad * 100))}%`
                  : "—"}{" "}
                выручки
              </Typography.Paragraph>
            </Flex>
          </Flex>
          <Typography.Paragraph view="small">
            {decisionText[result.decision].detail}
          </Typography.Paragraph>
          <Divider noGap />
          <Flex direction="column" gap={8}>
            <Typography.Paragraph view="small" color="secondary">
              Что повлияло на решение
            </Typography.Paragraph>
            <Flex wrap gap={8}>
              {result.factors.map((factor) => (
                <Tag key={factor.label} size="sm" color={factor.positive ? "success" : "error"}>
                  {factor.label}
                </Tag>
              ))}
            </Flex>
          </Flex>
          <Alert variant="info" fullWidth disableTruncate autoCloseDelay={null}>
            Это симуляция: данные никуда не отправляются, решение считается в браузере по упрощенным
            правилам и не является решением банка.
          </Alert>
        </Flex>
      )}
    </Dialog>
  );
}
