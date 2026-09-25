"use client";

import { useEffect, useState } from "react";
import { Alert, Button, Flex, Typography } from "bcc-design";
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
import { ApplicationContactForm, type ApplicationContact } from "./application-contact-form";
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
  contact,
  onContactChange,
  onUpdate,
  onEditParams,
  onClose,
}: {
  draft: DraftState;
  modelName: string;
  quote: Quote | null;
  quoteProblem: string;
  /** Contacts live in page memory only (not in localStorage), as in the contact form. */
  contact: ApplicationContact;
  onContactChange: (value: ApplicationContact) => void;
  onUpdate: (patch: DraftPatch) => void;
  onEditParams: () => void;
  onClose: () => void;
}) {
  const values = draft.values;
  const [sending, setSending] = useState(false);
  const [error, setError] = useState("");
  const [submission, setSubmission] = useState<Submission | null>(null);
  const fingerprint = `${applicationFingerprint(values)}|${contact.iin}|${contact.email.toLowerCase()}`;

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setSubmission(readSubmission());
  }, []);
  // Name and phone the client gave in the chat prefill empty form fields.
  useEffect(() => {
    const patch: Partial<ApplicationContact> = {};
    if (values.contactName && !contact.fullName) patch.fullName = values.contactName;
    if (values.contactPhone && !contact.phone) patch.phone = formatPhone(values.contactPhone);
    if (Object.keys(patch).length) onContactChange({ ...contact, ...patch });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [values.contactName, values.contactPhone]);

  const done = submission?.fingerprint === fingerprint ? submission.result : undefined;
  const missing = missingFields(draft).filter((f) => f !== "contactName" && f !== "contactPhone");
  const paramsReady = missing.length === 0 && quote !== null;

  /** Form edits also reach the shared draft, so the assistant knows contacts are given. */
  function changeContact(next: ApplicationContact) {
    onContactChange(next);
    const name = validateField("contactName", next.fullName);
    const phone = validateField("contactPhone", next.phone);
    const patch: DraftPatch = {};
    if (name.ok && name.value !== values.contactName) patch.contactName = name.value;
    if (phone.ok && phone.value !== values.contactPhone) patch.contactPhone = phone.value;
    if (Object.keys(patch).length) onUpdate(patch);
  }

  async function submit(valid: ApplicationContact) {
    setError("");
    if (!paramsReady) {
      setError("Сначала подтвердите параметры лизинга выше.");
      return;
    }
    const name = validateField("contactName", valid.fullName);
    const phone = validateField("contactPhone", valid.phone);
    if (!name.ok || !phone.ok) {
      setError(!name.ok ? name.error : phone.ok ? "" : phone.error);
      return;
    }
    const finalDraft: DraftState = {
      ...draft,
      values: { ...values, contactName: name.value, contactPhone: phone.value },
    };
    const finalFingerprint = `${applicationFingerprint(finalDraft.values)}|${valid.iin}|${valid.email.toLowerCase()}`;
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
          consent: valid.consent,
          contact: { email: valid.email, iin: valid.iin },
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
          ? "Нет соединения. Данные на месте — повторите отправку, дубликат не создастся."
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
            {/* Обход дефекта DS: Button с href рендерит <a> без самого href. */}
            <Button
              view="accentPrimary"
              size="l"
              fullWidth
              iconRight={<ArrowDirectionRight />}
              onClick={() => window.open(done.continueUrl, "_blank", "noopener,noreferrer")}
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
            htmlType="submit"
            form="leasing-contact-form"
            loading={sending}
            disabled={sending}
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

        <ApplicationContactForm
          value={contact}
          onChange={changeContact}
          onValid={(valid) => void submit(valid)}
          note="Контакты отправляются только вместе с заявкой в этот сервис и пока не передаются в BCC. В браузере они не сохраняются."
        />
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
