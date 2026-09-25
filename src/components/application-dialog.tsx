"use client";

import { useEffect, useState } from "react";
import { Alert, Button, Checkbox, Flex, Input, Typography } from "bcc-design";
import ArrowDirectionRight from "bcc-design-icons/base/Arrows/ArrowDirectionRight";
import { appPath } from "@/lib/app-path";
import {
  applicationFingerprint,
  FIELD_LABELS,
  formatPhone,
  missingFields,
  validateField,
  type DraftPatch,
  type DraftState,
} from "@/lib/draft";
import { money, percent } from "@/lib/format";
import type { Quote } from "@/lib/types";
import { sessionId } from "@/lib/use-lease-draft";
import { Dialog } from "./dialog";
import s from "./application-dialog.module.scss";

const SUBMISSION_KEY = "bcc-leasing-submission-v1";

type Submission = {
  fingerprint: string;
  idempotencyKey: string;
  result?: { id: string; createdAt: string; continueUrl: string };
};

function readSubmission(): Submission | null {
  try {
    return JSON.parse(localStorage.getItem(SUBMISSION_KEY) ?? "null") as Submission | null;
  } catch {
    return null;
  }
}
function writeSubmission(value: Submission) {
  try {
    localStorage.setItem(SUBMISSION_KEY, JSON.stringify(value));
  } catch {
    // Without storage the server still deduplicates by content within the session.
  }
}

export function ApplicationDialog({
  draft,
  modelName,
  quote,
  quoteProblem,
  onUpdate,
  onEditParams,
  onClose,
}: {
  draft: DraftState;
  modelName: string;
  quote: Quote | null;
  quoteProblem: string;
  onUpdate: (patch: DraftPatch) => void;
  onEditParams: () => void;
  onClose: () => void;
}) {
  const values = draft.values;
  const [name, setName] = useState(values.contactName);
  const [phone, setPhone] = useState(values.contactPhone ? formatPhone(values.contactPhone) : "");
  const [nameError, setNameError] = useState("");
  const [phoneError, setPhoneError] = useState("");
  const [consent, setConsent] = useState(false);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState("");
  const [submission, setSubmission] = useState<Submission | null>(null);
  const fingerprint = applicationFingerprint(values);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setSubmission(readSubmission());
  }, []);
  // Contacts filled in the chat after the dialog opened.
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (values.contactName) setName(values.contactName);
    if (values.contactPhone) setPhone(formatPhone(values.contactPhone));
  }, [values.contactName, values.contactPhone]);

  const done = submission?.fingerprint === fingerprint ? submission.result : undefined;
  const missing = missingFields(draft).filter((f) => f !== "contactName" && f !== "contactPhone");
  const paramsReady = missing.length === 0 && quote !== null;

  function commitName(value: string) {
    const checked = validateField("contactName", value);
    setNameError(checked.ok || !value ? "" : checked.error);
    if (checked.ok && checked.value !== values.contactName)
      onUpdate({ contactName: checked.value });
    return checked.ok;
  }
  function commitPhone(value: string) {
    const checked = validateField("contactPhone", value);
    setPhoneError(checked.ok || !value ? "" : checked.error);
    if (checked.ok && checked.value !== values.contactPhone)
      onUpdate({ contactPhone: checked.value });
    return checked.ok;
  }

  async function submit() {
    setError("");
    const nameOk = commitName(name);
    const phoneOk = commitPhone(phone);
    if (!nameOk)
      setNameError(
        name
          ? validateField("contactName", name).ok
            ? ""
            : "Имя — от 2 до 80 букв."
          : "Укажите контактное лицо.",
      );
    if (!phoneOk)
      setPhoneError(
        phone ? "Телефон — казахстанский номер, например +7 701 123 45 67." : "Укажите телефон.",
      );
    if (!nameOk || !phoneOk || !paramsReady || !consent) return;

    const contactName = (validateField("contactName", name) as { value: string }).value;
    const contactPhone = (validateField("contactPhone", phone) as { value: string }).value;
    const finalDraft: DraftState = {
      ...draft,
      values: { ...values, contactName, contactPhone },
    };
    const finalFingerprint = applicationFingerprint(finalDraft.values);
    // The same content keeps the same key: a repeated click or retry cannot create a duplicate.
    const current = readSubmission();
    const idempotencyKey =
      current?.fingerprint === finalFingerprint ? current.idempotencyKey : crypto.randomUUID();
    writeSubmission({ fingerprint: finalFingerprint, idempotencyKey });

    setSending(true);
    try {
      const response = await fetch(appPath("/api/applications"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sessionId: sessionId(),
          idempotencyKey,
          consent,
          draft: finalDraft,
        }),
      });
      const data = (await response.json().catch(() => null)) as {
        id?: string;
        createdAt?: string;
        continueUrl?: string;
        error?: string;
        missing?: string[];
      } | null;
      if (!response.ok || !data?.id)
        throw new Error(
          data?.missing?.length
            ? `Не хватает: ${data.missing.join(", ").toLowerCase()}.`
            : data?.error || "Не удалось отправить заявку.",
        );
      const next: Submission = {
        fingerprint: finalFingerprint,
        idempotencyKey,
        result: { id: data.id, createdAt: data.createdAt!, continueUrl: data.continueUrl! },
      };
      writeSubmission(next);
      setSubmission(next);
    } catch (err) {
      setError(
        err instanceof TypeError
          ? "Нет соединения. Данные сохранены — повторите отправку, дубликат не создастся."
          : (err as Error).message,
      );
    } finally {
      setSending(false);
    }
  }

  if (done)
    return (
      <Dialog
        title="Заявка сохранена"
        description={`Номер обращения ${done.id}`}
        onClose={onClose}
        footer={
          <Flex direction="column" gap={8}>
            <Button
              view="accentPrimary"
              size="l"
              fullWidth
              href={done.continueUrl}
              target="_blank"
              rel="noreferrer"
              iconRight={<ArrowDirectionRight />}
            >
              Продолжить в сервисе BCC Leasing
            </Button>
            <Button view="neutral" size="l" fullWidth onClick={onClose}>
              Готово
            </Button>
          </Flex>
        }
      >
        <Alert variant="info" fullWidth disableTruncate autoCloseDelay={null}>
          Заявка сохранена в этом сервисе. Автоматическая передача в систему BCC пока не подключена:
          чтобы продолжить оформление, откройте сервис BCC Leasing. Повторная отправка тех же данных
          не создаст новую заявку.
        </Alert>
      </Dialog>
    );

  return (
    <Dialog
      title="Заявка на лизинг"
      description="Проверьте данные перед отправкой"
      onClose={onClose}
      footer={
        <Flex direction="column" gap={8}>
          <Button
            view="accentPrimary"
            size="l"
            fullWidth
            loading={sending}
            disabled={!paramsReady || !consent || sending}
            onClick={() => void submit()}
          >
            Отправить заявку
          </Button>
          <Button view="neutral" size="l" fullWidth onClick={onClose}>
            Вернуться к расчету
          </Button>
        </Flex>
      }
    >
      <Flex direction="column" gap={24}>
        <Flex direction="column" gap={12}>
          <Flex justifyContent="space-between" alignItems="center" gap={8}>
            <Typography.Paragraph view="medium" weight="semibold">
              Параметры лизинга
            </Typography.Paragraph>
            <Button view="link" size="s" onClick={onEditParams}>
              Изменить
            </Button>
          </Flex>
          <dl className={s.details}>
            <Row label="Тип клиента" value={values.clientType === "IP" ? "ИП" : "ТОО"} />
            <Row label="Автомобиль" value={modelName} />
            <Row label="Стоимость" value={values.price ? money(values.price) : "не указана"} />
            <Row
              label="Аванс"
              value={`${percent(values.advancePercent)}%${quote ? `, ${money(quote.advanceAmount)}` : ""}`}
            />
            <Row label="Срок" value={`${values.months} мес.`} />
            {quote && (
              <Row label="Платеж" value={`${money(quote.monthlyPayment)} в месяц`} strong />
            )}
          </dl>
          {missing.length > 0 && (
            <Alert variant="warning" fullWidth disableTruncate autoCloseDelay={null}>
              {missing.includes("price") && !values.price
                ? "Укажите стоимость автомобиля в калькуляторе или в чате."
                : `Сейчас это значения из примера: ${missing
                    .map((f) => FIELD_LABELS[f].toLowerCase())
                    .join(
                      ", ",
                    )}. Проверьте их и подтвердите — без подтверждения заявка не отправляется.`}
            </Alert>
          )}
          {missing.length > 0 && !(missing.includes("price") && !values.price) && (
            <Button
              view="accentSecondary"
              size="m"
              fullWidth
              onClick={() =>
                // Explicit client action: the shown example values become confirmed data.
                onUpdate(Object.fromEntries(missing.map((f) => [f, values[f]])) as DraftPatch)
              }
            >
              Параметры верны
            </Button>
          )}
          {missing.length === 0 && !quote && (
            <Alert variant="warning" fullWidth disableTruncate autoCloseDelay={null}>
              {quoteProblem || "Расчет по этим параметрам недоступен. Измените параметры."}
            </Alert>
          )}
          {quote && (
            <Typography.Caption view="large" color="secondary">
              Предварительный расчет без комиссий, страхования и выкупа. Не является офертой.
            </Typography.Caption>
          )}
        </Flex>

        <Flex direction="column" gap={12}>
          <Typography.Paragraph view="medium" weight="semibold">
            Контакты
          </Typography.Paragraph>
          <Input
            fullWidth
            size="lg"
            label="Контактное лицо"
            autoComplete="name"
            value={name}
            error={nameError || undefined}
            onChange={(_, payload) => setName(payload.value)}
            onBlur={() => commitName(name)}
          />
          <Input
            fullWidth
            size="lg"
            label="Телефон"
            type="tel"
            inputMode="tel"
            autoComplete="tel"
            value={phone}
            error={phoneError || undefined}
            hint={phoneError ? undefined : "Только для связи по этой заявке"}
            onChange={(_, payload) => setPhone(payload.value)}
            onBlur={() => commitPhone(phone)}
          />
          <Checkbox
            checked={consent}
            label="Согласен на обработку контактных данных для рассмотрения заявки"
            onChange={(_, payload) => setConsent(payload.checked)}
          />
        </Flex>
        {error && (
          <Alert variant="error" fullWidth disableTruncate autoCloseDelay={null}>
            {error}
          </Alert>
        )}
      </Flex>
    </Dialog>
  );
}

function Row({ label, value, strong = false }: { label: string; value: string; strong?: boolean }) {
  return (
    <div className={s.row}>
      <dt>
        <Typography.Paragraph view="small" color="secondary">
          {label}
        </Typography.Paragraph>
      </dt>
      <dd>
        <Typography.Paragraph view="small" weight={strong ? "semibold" : "medium"} monospaceNumbers>
          {value}
        </Typography.Paragraph>
      </dd>
    </div>
  );
}
