"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Button, Card, Chip, Flex, Spinner, Tag, Textarea, Typography } from "bcc-design";
import ArrowLineDirectionUp from "bcc-design-icons/base/Arrows/ArrowLineDirectionUp";
import Refresh from "bcc-design-icons/base/Arrows/Refresh";
import CheckOutlinedBold from "bcc-design-icons/base/Basic/CheckOutlinedBold";
import Pause from "bcc-design-icons/base/Basic/Pause";
import Chat from "bcc-design-icons/base/Communication/Chat";
import Close from "bcc-design-icons/base/Navigation/Close";
import Microphone from "bcc-design-icons/base/Tech/Microphone";
import type {
  AssistantCard,
  AssistantResponse,
  ChatTurn,
  QuoteView,
} from "@/lib/assistant-contract";
import { appPath } from "@/lib/app-path";
import {
  FIELD_LABELS,
  maskPhone,
  missingFields,
  setFields,
  type DraftField,
  type DraftPatch,
  type DraftState,
} from "@/lib/draft";
import { dateLabel, money, percent } from "@/lib/format";
import type { ClientType, Quote } from "@/lib/types";
import { sessionId } from "@/lib/use-lease-draft";
import s from "./assistant-panel.module.scss";

const CHAT_KEY = "bcc-leasing-chat-v1";
const MAX_STORED = 40;
const MAX_RECORDING_SECONDS = 60;

type ChatMessage = {
  id: string;
  role: "user" | "assistant";
  text: string;
  cards?: AssistantCard[];
  notice?: string;
  /** User message whose request failed: shown with «Повторить». */
  failed?: string;
  filled?: { applied: DraftField[]; skipped: DraftField[] };
  /** Offers become stale once model, client type or price change. */
  contextKey?: string;
};

const QUICK_ACTIONS = ["Рассчитать лизинг", "Узнать условия", "Заполнить заявку"];
const TRACKED_FIELDS: DraftField[] = [
  "clientType",
  "modelId",
  "price",
  "advancePercent",
  "months",
  "contactName",
  "contactPhone",
];

function loadMessages(): ChatMessage[] {
  try {
    const raw = localStorage.getItem(CHAT_KEY);
    const parsed = raw ? (JSON.parse(raw) as ChatMessage[]) : [];
    return Array.isArray(parsed) ? parsed.slice(-MAX_STORED) : [];
  } catch {
    return [];
  }
}

function saveMessages(messages: ChatMessage[]) {
  try {
    localStorage.setItem(CHAT_KEY, JSON.stringify(messages.slice(-MAX_STORED)));
  } catch {
    // Storage unavailable: the conversation lives until reload.
  }
}

const contextKeyOf = (draft: DraftState) =>
  `${draft.values.modelId}:${draft.values.clientType}:${draft.values.price}`;

function fieldValue(field: DraftField, draft: DraftState, modelName: string): string {
  const v = draft.values;
  switch (field) {
    case "clientType":
      return v.clientType === "IP" ? "ИП" : "ТОО";
    case "modelId":
      return modelName;
    case "price":
      return v.price ? money(v.price) : "—";
    case "advancePercent":
      return `${percent(v.advancePercent)}%`;
    case "months":
      return `${v.months} мес.`;
    case "contactName":
      return v.contactName || "—";
    case "contactPhone":
      return v.contactPhone ? maskPhone(v.contactPhone) : "—";
    case "subject":
      return v.subject === "car" ? "легковой автомобиль" : "—";
  }
}

type Recognition = {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  onresult:
    | ((event: { results: { [key: number]: { [key: number]: { transcript: string } } } }) => void)
    | null;
  onend: (() => void) | null;
  onerror: ((event: { error: string }) => void) | null;
  start: () => void;
  stop: () => void;
  abort: () => void;
};
type SpeechWindow = Window & {
  SpeechRecognition?: new () => Recognition;
  webkitSpeechRecognition?: new () => Recognition;
};

export function AssistantPanel({
  draft,
  modelName,
  onPatch,
  onSelectModel,
  onApplyOffer,
  onOpenApplication,
  onEditData,
  onClose,
}: {
  draft: DraftState;
  modelName: string;
  onPatch: (
    patch: DraftPatch,
    baseRevs: DraftState["revs"],
  ) => { applied: DraftField[]; skipped: DraftField[] };
  onSelectModel: (modelId: number) => void;
  onApplyOffer: (quote: Quote, maxMonthly: number, clientType: ClientType) => void;
  onOpenApplication: () => void;
  onEditData: () => void;
  onClose: () => void;
}) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [restored, setRestored] = useState(false);
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  const [showFields, setShowFields] = useState(false);
  const [voice, setVoice] = useState<"idle" | "recording" | "transcribing" | "dictating">("idle");
  const [voiceNotice, setVoiceNotice] = useState("");
  const [seconds, setSeconds] = useState(0);
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const busyRef = useRef(false);
  const messagesRef = useRef<ChatMessage[]>([]);
  const abortRef = useRef<AbortController | null>(null);
  const draftRef = useRef(draft);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const discardRef = useRef(false);
  const recognitionRef = useRef<Recognition | null>(null);

  useEffect(() => {
    draftRef.current = draft;
  }, [draft]);
  useEffect(() => {
    messagesRef.current = messages;
    if (restored) saveMessages(messages);
  }, [messages, restored]);
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setMessages(loadMessages());
    setRestored(true);
    return () => {
      abortRef.current?.abort();
      recorderRef.current?.stream.getTracks().forEach((track) => track.stop());
      recognitionRef.current?.abort();
    };
  }, []);
  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, busy]);

  const send = useCallback(
    async (messageText: string, retryId?: string, draftOverride?: DraftState) => {
      const content = messageText.trim();
      if (!content || busyRef.current) return;
      busyRef.current = true;
      setBusy(true);
      const userId = retryId ?? crypto.randomUUID();
      // History for the model: successful turns only, before this message.
      const history: ChatTurn[] = messagesRef.current
        .filter((m) => !m.failed && m.id !== userId)
        .slice(-16)
        .map((m) => ({ role: m.role, content: m.text }));
      setMessages((current) =>
        retryId
          ? current.map((m) => (m.id === retryId ? { ...m, failed: undefined } : m))
          : [...current, { id: userId, role: "user", text: content }],
      );
      if (!retryId) setText("");
      const controller = new AbortController();
      abortRef.current = controller;
      try {
        const response = await fetch(appPath("/api/assistant"), {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          signal: controller.signal,
          body: JSON.stringify({
            sessionId: sessionId(),
            messageId: userId,
            message: content,
            history,
            draft: draftOverride ?? draftRef.current,
          }),
        });
        const data = (await response.json().catch(() => null)) as
          (AssistantResponse & { error?: string }) | null;
        if (!response.ok || !data || data.error)
          throw new Error(data?.error || "Помощник сейчас недоступен.");
        // Late answers: fields the user changed after sending keep the user's value.
        const filled = onPatch(data.patch, data.baseRevs);
        setMessages((current) => [
          ...current,
          {
            id: crypto.randomUUID(),
            role: "assistant",
            text: data.reply,
            cards: data.cards,
            notice: data.notice,
            filled: filled.applied.length || filled.skipped.length ? filled : undefined,
            contextKey: contextKeyOf(draftRef.current),
          },
        ]);
      } catch (error) {
        if ((error as Error).name === "AbortError") return;
        const reason =
          error instanceof TypeError
            ? "Нет соединения. Проверьте интернет и повторите."
            : (error as Error).message || "Не удалось получить ответ.";
        setMessages((current) =>
          current.map((m) => (m.id === userId ? { ...m, failed: reason } : m)),
        );
      } finally {
        busyRef.current = false;
        setBusy(false);
      }
    },
    [onPatch],
  );

  /** Vehicle chosen from a card: set it in the calculator and continue the dialog. */
  function selectVehicle(option: { id: number; label: string; partner: string }) {
    const next = setFields(draftRef.current, { modelId: option.id }, "form");
    onSelectModel(option.id);
    draftRef.current = next;
    void send(`Выбираю ${option.label}, ${option.partner}`, undefined, next);
  }

  const stopRecording = useCallback((discard = false) => {
    discardRef.current = discard;
    recorderRef.current?.stop();
  }, []);

  useEffect(() => {
    if (voice !== "recording") return;
    const timer = setInterval(() => setSeconds((value) => value + 1), 1000);
    return () => clearInterval(timer);
  }, [voice]);
  useEffect(() => {
    if (voice === "recording" && seconds >= MAX_RECORDING_SECONDS) stopRecording();
  }, [seconds, voice, stopRecording]);

  async function transcribe(blob: Blob) {
    setVoice("transcribing");
    try {
      const form = new FormData();
      form.append("sessionId", sessionId());
      const type = blob.type.split(";")[0] || "audio/webm";
      form.append(
        "audio",
        new File([blob], `voice.${type.includes("mp4") ? "m4a" : "webm"}`, { type }),
      );
      const response = await fetch(appPath("/api/transcribe"), { method: "POST", body: form });
      const data = (await response.json().catch(() => null)) as {
        text?: string;
        error?: string;
      } | null;
      if (!response.ok || !data?.text)
        throw new Error(data?.error || "Не удалось распознать запись.");
      const transcript = data.text;
      setText((current) => (current ? `${current} ${transcript}` : transcript));
      setVoiceNotice("Проверьте распознанный текст и нажмите «Отправить».");
      inputRef.current?.focus();
    } catch (error) {
      setVoiceNotice((error as Error).message || "Не удалось распознать запись. Напишите текстом.");
    } finally {
      setVoice("idle");
    }
  }

  /** Browser dictation — fallback where MediaRecorder is unavailable. */
  function startDictation() {
    const speechWindow = window as SpeechWindow;
    const Api = speechWindow.SpeechRecognition || speechWindow.webkitSpeechRecognition;
    if (!Api) {
      setVoiceNotice("В этом браузере запись голоса недоступна. Напишите сообщение.");
      return;
    }
    const recognition = new Api();
    recognitionRef.current = recognition;
    recognition.lang = "ru-RU";
    recognition.continuous = false;
    recognition.interimResults = false;
    recognition.onresult = (event) => {
      setText(event.results[0][0].transcript);
      setVoiceNotice("Проверьте распознанный текст и нажмите «Отправить».");
    };
    recognition.onend = () => setVoice("idle");
    recognition.onerror = () => {
      setVoice("idle");
      setVoiceNotice("Не удалось распознать речь. Попробуйте еще раз или напишите текстом.");
    };
    recognition.start();
    setVoice("dictating");
  }

  async function startRecording() {
    setVoiceNotice("");
    if (typeof MediaRecorder === "undefined" || !navigator.mediaDevices?.getUserMedia) {
      startDictation();
      return;
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const type = ["audio/webm;codecs=opus", "audio/webm", "audio/mp4"].find((t) =>
        MediaRecorder.isTypeSupported(t),
      );
      const recorder = new MediaRecorder(stream, type ? { mimeType: type } : undefined);
      const chunks: Blob[] = [];
      discardRef.current = false;
      recorder.ondataavailable = (event) => {
        if (event.data.size) chunks.push(event.data);
      };
      recorder.onstop = () => {
        stream.getTracks().forEach((track) => track.stop());
        recorderRef.current = null;
        if (discardRef.current || !chunks.length) {
          setVoice("idle");
          return;
        }
        void transcribe(new Blob(chunks, { type: recorder.mimeType || "audio/webm" }));
      };
      recorderRef.current = recorder;
      recorder.start();
      setSeconds(0);
      setVoice("recording");
    } catch {
      setVoiceNotice("Разрешите доступ к микрофону в браузере или напишите сообщение.");
    }
  }

  const missing = missingFields(draft);
  const filledCount = TRACKED_FIELDS.length - missing.length;
  const currentKey = contextKeyOf(draft);

  return (
    <Card size="m" type="primary" height="auto">
      <section aria-label="ИИ-помощник" className={s.body}>
        {/* Заголовок */}
        <Flex justifyContent="space-between" alignItems="flex-start" gap={16}>
          <Flex gap={12} alignItems="center">
            <span className={s.tile}>
              <Chat />
            </span>
            <Flex direction="column" gap={2}>
              <Typography.Title tag="div" view="block" role="heading" aria-level={2}>
                ИИ-помощник
              </Typography.Title>
              <Typography.Caption view="large" color="secondary">
                Консультация, расчет и заявка в одном диалоге
              </Typography.Caption>
            </Flex>
          </Flex>
          <Button
            view="neutral"
            size="m"
            iconLeft={<Close />}
            aria-label="Закрыть помощника"
            onClick={onClose}
          />
        </Flex>

        {/* Данные заявки: что заполнено и чего не хватает */}
        <div className={s.fields}>
          <button
            type="button"
            className={s.fieldsToggle}
            aria-expanded={showFields}
            onClick={() => setShowFields(!showFields)}
          >
            <Typography.Paragraph view="small" weight="semibold" tag="span">
              Данные заявки: {filledCount} из {TRACKED_FIELDS.length}
            </Typography.Paragraph>
            <Tag color={missing.length ? "warning" : "success"} size="sm">
              {missing.length ? `Не хватает: ${missing.length}` : "Все заполнено"}
            </Tag>
          </button>
          {showFields && (
            <Flex direction="column" gap={12}>
              <dl className={s.fieldList}>
                {TRACKED_FIELDS.map((field) => {
                  const isMissing = missing.includes(field);
                  const isExample =
                    draft.sources[field] === "default" &&
                    !["contactName", "contactPhone"].includes(field);
                  return (
                    <div key={field}>
                      <dt>
                        <Typography.Caption view="large" color="secondary">
                          {FIELD_LABELS[field]}
                        </Typography.Caption>
                      </dt>
                      <dd>
                        <Typography.Paragraph view="small" weight="medium" tag="span">
                          {fieldValue(field, draft, modelName)}
                          {isExample ? " · пример" : ""}
                        </Typography.Paragraph>
                        {isMissing ? (
                          <Tag color="warning" size="xs">
                            нужно
                          </Tag>
                        ) : (
                          <CheckOutlinedBold width={14} height={14} className={s.ok} />
                        )}
                      </dd>
                    </div>
                  );
                })}
              </dl>
              <Flex gap={8} wrap>
                <Button view="accentSecondary" size="s" onClick={onEditData}>
                  Изменить данные
                </Button>
                <Button view="accentPrimary" size="s" onClick={onOpenApplication}>
                  Проверить заявку
                </Button>
              </Flex>
            </Flex>
          )}
        </div>

        {/* Диалог */}
        <div
          ref={scrollRef}
          className={s.conversation}
          aria-live="polite"
          aria-relevant="additions"
        >
          {!messages.length && (
            <Flex direction="column" gap={12} className={s.welcome}>
              <Typography.Title tag="div" view="paragraph" role="heading" aria-level={3}>
                Чем помочь?
              </Typography.Title>
              <Typography.Paragraph view="small" color="secondary">
                Объясню условия автолизинга, рассчитаю платеж и заполню заявку по вашим словам.
                Например: «Автомобиль за 20 млн тенге, аванс 20%, на 3 года».
              </Typography.Paragraph>
            </Flex>
          )}
          {messages.map((message) => (
            <Flex
              key={message.id}
              direction="column"
              gap={8}
              className={message.role === "user" ? s.userMessage : s.assistantMessage}
            >
              {message.notice && (
                <Typography.Caption view="large" color="secondary">
                  {message.notice}
                </Typography.Caption>
              )}
              <Typography.Paragraph view="small" className={s.bubble}>
                {message.text}
              </Typography.Paragraph>
              {message.failed && (
                <Flex gap={8} alignItems="center" wrap role="alert">
                  <Typography.Caption view="large" className={s.error}>
                    {message.failed}
                  </Typography.Caption>
                  <Button
                    view="link"
                    size="s"
                    iconLeft={<Refresh />}
                    disabled={busy}
                    onClick={() => send(message.text, message.id)}
                  >
                    Повторить
                  </Button>
                </Flex>
              )}
              {message.filled && (
                <FilledNotice
                  filled={message.filled}
                  draft={draft}
                  modelName={modelName}
                  onEdit={onEditData}
                />
              )}
              {message.cards?.map((card, index) => (
                <CardView
                  key={`${card.type}:${index}`}
                  card={card}
                  stale={message.contextKey !== currentKey}
                  busy={busy}
                  onSelectVehicle={selectVehicle}
                  onApplyOffer={onApplyOffer}
                  onOpenApplication={onOpenApplication}
                />
              ))}
            </Flex>
          ))}
          {busy && (
            <Flex gap={8} alignItems="center" role="status">
              <Spinner size="sm" />
              <Typography.Caption view="large" color="secondary">
                Помощник отвечает…
              </Typography.Caption>
            </Flex>
          )}
        </div>

        {/* Быстрые действия и ввод */}
        <Flex wrap>
          {QUICK_ACTIONS.map((action) => (
            <Chip
              key={action}
              clickable
              variant="inactive"
              size="s"
              disabled={busy}
              onClick={() => send(action)}
            >
              {action}
            </Chip>
          ))}
        </Flex>
        <form
          onSubmit={(event) => {
            event.preventDefault();
            void send(text);
          }}
        >
          <Flex direction="column" gap={8}>
            {voice === "recording" ? (
              <Flex
                className={s.recording}
                alignItems="center"
                justifyContent="space-between"
                gap={12}
                role="status"
              >
                <Flex gap={8} alignItems="center">
                  <span className={s.recDot} aria-hidden />
                  <Typography.Paragraph view="small" weight="medium" tag="span">
                    Запись {Math.floor(seconds / 60)}:{String(seconds % 60).padStart(2, "0")}
                  </Typography.Paragraph>
                </Flex>
                <Flex gap={8}>
                  <Button view="neutral" size="s" onClick={() => stopRecording(true)}>
                    Отменить
                  </Button>
                  <Button view="accentPrimary" size="s" onClick={() => stopRecording()}>
                    Готово
                  </Button>
                </Flex>
              </Flex>
            ) : (
              <Textarea
                ref={inputRef}
                fullWidth
                aria-label="Сообщение помощнику"
                rows={2}
                maxLength={1000}
                placeholder={
                  voice === "transcribing"
                    ? "Распознаю голосовое сообщение…"
                    : voice === "dictating"
                      ? "Слушаю вас…"
                      : "Напишите или запишите голосовое…"
                }
                value={text}
                disabled={voice === "transcribing"}
                onChange={(_, payload) => setText(payload.value)}
                onKeyDown={(event) => {
                  if (event.key === "Enter" && !event.shiftKey && !event.nativeEvent.isComposing) {
                    event.preventDefault();
                    void send(text);
                  }
                }}
              />
            )}
            <Flex justifyContent="space-between" alignItems="center" gap={8}>
              <Typography.Caption view="large" color="secondary">
                {voice === "transcribing" ? "Распознаю речь…" : "Enter, чтобы отправить"}
              </Typography.Caption>
              <Flex gap={8}>
                <Button
                  view={voice === "dictating" ? "destructiveSecondary" : "neutral"}
                  size="m"
                  iconLeft={
                    voice === "transcribing" ? (
                      <Spinner size="xs" />
                    ) : voice === "dictating" ? (
                      <Pause />
                    ) : (
                      <Microphone />
                    )
                  }
                  aria-label={
                    voice === "dictating" ? "Остановить диктовку" : "Записать голосовое сообщение"
                  }
                  aria-pressed={voice === "dictating"}
                  disabled={busy || voice === "transcribing" || voice === "recording"}
                  onClick={() =>
                    voice === "dictating" ? recognitionRef.current?.stop() : void startRecording()
                  }
                />
                <Button
                  view="accentPrimary"
                  size="m"
                  htmlType="submit"
                  iconLeft={<ArrowLineDirectionUp />}
                  aria-label="Отправить сообщение"
                  disabled={!text.trim() || busy || voice === "recording"}
                />
              </Flex>
            </Flex>
          </Flex>
        </form>
        {voiceNotice && (
          <Typography.Caption view="large" color="secondary" role="status">
            {voiceNotice}
          </Typography.Caption>
        )}
        <Typography.Caption view="medium" color="secondary">
          Ответы ИИ и расчеты предварительные, не являются офертой.
        </Typography.Caption>
      </section>
    </Card>
  );
}

function FilledNotice({
  filled,
  draft,
  modelName,
  onEdit,
}: {
  filled: { applied: DraftField[]; skipped: DraftField[] };
  draft: DraftState;
  modelName: string;
  onEdit: () => void;
}) {
  const shown = filled.applied.filter((f) => f !== "subject");
  if (!shown.length && !filled.skipped.length) return null;
  return (
    <Card size="s" type="secondary">
      <Flex direction="column" gap={6}>
        {shown.length > 0 && (
          <Typography.Caption view="large">
            Заполнено в калькуляторе и заявке:{" "}
            {shown
              .map((f) => `${FIELD_LABELS[f].toLowerCase()}: ${fieldValue(f, draft, modelName)}`)
              .join(", ")}
            .
          </Typography.Caption>
        )}
        {filled.skipped.length > 0 && (
          <Typography.Caption view="large" color="secondary">
            Не изменено, потому что вы поправили это вручную:{" "}
            {filled.skipped.map((f) => FIELD_LABELS[f].toLowerCase()).join(", ")}.
          </Typography.Caption>
        )}
        <div>
          <Button view="link" size="s" onClick={onEdit}>
            Изменить данные
          </Button>
        </div>
      </Flex>
    </Card>
  );
}

function QuoteCard({ quote }: { quote: QuoteView }) {
  return (
    <Card size="s" type="secondary">
      <Flex direction="column" gap={10}>
        <Flex justifyContent="space-between" alignItems="center" gap={8}>
          <Typography.Caption view="large" color="secondary">
            Предварительный расчет
          </Typography.Caption>
          <Tag color="info" size="xs">
            не оферта
          </Tag>
        </Flex>
        <Flex alignItems="baseline" gap={8}>
          <Typography.Paragraph view="xlarge" weight="bold" monospaceNumbers>
            {money(quote.monthlyPayment)}
          </Typography.Paragraph>
          <Typography.Caption view="large" color="secondary">
            в месяц
          </Typography.Caption>
        </Flex>
        <dl className={s.quoteParams}>
          <div>
            <dt>Автомобиль</dt>
            <dd>{quote.modelLabel}</dd>
          </div>
          <div>
            <dt>Стоимость</dt>
            <dd>{money(quote.price)}</dd>
          </div>
          <div>
            <dt>Аванс</dt>
            <dd>
              {money(quote.advanceAmount)} ({percent(quote.advancePercent)}%)
            </dd>
          </div>
          <div>
            <dt>Срок</dt>
            <dd>{quote.months} мес.</dd>
          </div>
          <div>
            <dt>Ставка</dt>
            <dd>{percent(quote.annualRate)}% годовых</dd>
          </div>
        </dl>
        <Typography.Caption view="medium" color="secondary">
          {quote.source === "live" ? "Тарифы BCC" : `Тарифы от ${dateLabel(quote.checkedAt)}`}. Без
          комиссий, страхования и выкупа.
        </Typography.Caption>
      </Flex>
    </Card>
  );
}

function CardView({
  card,
  stale,
  busy,
  onSelectVehicle,
  onApplyOffer,
  onOpenApplication,
}: {
  card: AssistantCard;
  stale: boolean;
  busy: boolean;
  onSelectVehicle: (option: { id: number; label: string; partner: string }) => void;
  onApplyOffer: (quote: Quote, maxMonthly: number, clientType: ClientType) => void;
  onOpenApplication: () => void;
}) {
  switch (card.type) {
    case "quote":
      return <QuoteCard quote={card.quote} />;
    case "vehicles":
      return (
        <Flex direction="column" gap={6}>
          <Typography.Caption view="large" color="secondary">
            Выберите запись справочника:
          </Typography.Caption>
          <Flex wrap>
            {card.options.map((option) => (
              <Chip
                key={option.id}
                clickable
                variant="inactive"
                size="s"
                disabled={busy}
                onClick={() => onSelectVehicle(option)}
              >
                {option.label} · {option.partner}
              </Chip>
            ))}
          </Flex>
        </Flex>
      );
    case "offers":
      return (
        <Flex direction="column" gap={8}>
          {card.offers.map((offer, index) => (
            <Card size="s" type="secondary" key={`${offer.rate.rateId}:${index}`}>
              <Flex direction="column" gap={8}>
                <div>
                  <Tag
                    color="success"
                    size="sm"
                    leftIcon={<CheckOutlinedBold width={14} height={14} />}
                  >
                    {index === 0 ? "В вашем бюджете" : "Еще один вариант"}
                  </Tag>
                </div>
                <Flex alignItems="baseline" gap={8} wrap>
                  <Typography.Paragraph view="large" weight="bold" monospaceNumbers>
                    {money(offer.monthlyPayment)}
                  </Typography.Paragraph>
                  <Typography.Caption view="large" color="secondary">
                    в месяц, {offer.rate.months} мес., аванс {money(offer.advanceAmount)} (
                    {percent(offer.rate.advancePercent)}%)
                  </Typography.Caption>
                </Flex>
                <Button
                  view="accentPrimary"
                  size="s"
                  fullWidth
                  disabled={stale || busy}
                  onClick={() => onApplyOffer(offer, card.maxMonthly, card.clientType)}
                >
                  {stale ? "Параметры изменились, повторите подбор" : "Применить условия"}
                </Button>
              </Flex>
            </Card>
          ))}
        </Flex>
      );
    case "missing":
      return card.fields.length ? (
        <Card size="s" type="secondary">
          <Typography.Caption view="large">
            Не хватает для заявки:{" "}
            {card.fields.map((f) => FIELD_LABELS[f].toLowerCase()).join(", ")}.
          </Typography.Caption>
        </Card>
      ) : null;
    case "summary":
      return (
        <Card size="s" type="secondary">
          <Flex direction="column" gap={8}>
            <Typography.Caption view="large">
              Заявка готова. Проверьте итог и подтвердите отправку: без вашего подтверждения она не
              отправляется.
            </Typography.Caption>
            <Button view="accentPrimary" size="s" fullWidth onClick={onOpenApplication}>
              Проверить и отправить
            </Button>
          </Flex>
        </Card>
      );
  }
}
