"use client";

import { appPath } from "@/lib/app-path";

import { useEffect, useRef, useState } from "react";
import { Button, Card, Chip, Flex, Spinner, Tag, Textarea, Typography } from "bcc-design";
import ArrowLineDirectionUp from "bcc-design-icons/base/Arrows/ArrowLineDirectionUp";
import ChevronDirectionDown from "bcc-design-icons/base/Arrows/ChevronDirectionDown";
import ChevronDirectionUp from "bcc-design-icons/base/Arrows/ChevronDirectionUp";
import CheckOutlinedBold from "bcc-design-icons/base/Basic/CheckOutlinedBold";
import Pause from "bcc-design-icons/base/Basic/Pause";
import Chat from "bcc-design-icons/base/Communication/Chat";
import Close from "bcc-design-icons/base/Navigation/Close";
import Filter from "bcc-design-icons/base/Navigation/Filter";
import Microphone from "bcc-design-icons/base/Tech/Microphone";
import { parseMessage, type ParsedIntent } from "@/lib/assistant";
import { calculateQuote, estimateMaxPrice, findOffers, isPriceAllowed } from "@/lib/finance";
import { dateLabel, money, percent } from "@/lib/format";
import type { ClientType, Quote, TermsData } from "@/lib/types";
import { MoneyInput } from "./money-input";
import s from "./assistant-panel.module.scss";

type Context = {
  modelId: number;
  modelName: string;
  clientType: ClientType;
  price: number;
  advancePercent: number;
  months: number;
};
type Budget = {
  maxMonthly?: number;
  maxAdvance?: number;
  price: number;
  clientType: ClientType;
  lockedMonths?: number;
};
type Message = {
  id: number;
  role: "user" | "assistant";
  text: string;
  offers?: Quote[];
  contextKey?: string;
  budget?: Budget;
  generation?: number;
};
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

function mergeBudget(previous: Budget, intent: ParsedIntent): Budget {
  return {
    ...previous,
    ...(intent.maxMonthly !== undefined && { maxMonthly: intent.maxMonthly }),
    ...(intent.maxAdvance !== undefined && { maxAdvance: intent.maxAdvance }),
    ...(intent.price !== undefined && { price: intent.price }),
    ...(intent.clientType !== undefined && { clientType: intent.clientType }),
    ...(intent.months !== undefined && { lockedMonths: intent.months ?? undefined }),
  };
}

export function AssistantPanel({
  context,
  terms,
  onClose,
  onApply,
}: {
  context: Context;
  terms: TermsData | null;
  onClose: () => void;
  onApply: (quote: Quote, maxMonthly: number, clientType: ClientType) => void;
}) {
  const contextKey = `${context.modelId}:${context.clientType}:${context.price}:${context.advancePercent}:${context.months}:${terms?.checkedAt ?? ""}`;
  const defaultBudget: Budget = {
    maxAdvance: context.price
      ? Number(((context.price * context.advancePercent) / 100).toFixed(2))
      : undefined,
    price: context.price,
    clientType: context.clientType,
  };
  const [memory, setMemory] = useState<{ key: string; budget: Budget }>({
    key: contextKey,
    budget: defaultBudget,
  });
  const budget = memory.key === contextKey ? memory.budget : defaultBudget;
  const [messages, setMessages] = useState<Message[]>([]);
  const [draft, setDraft] = useState("");
  const [busy, setBusy] = useState(false);
  const [showBudget, setShowBudget] = useState(false);
  const [listening, setListening] = useState(false);
  const [voiceNotice, setVoiceNotice] = useState("");
  const [awaitedSlot, setAwaitedSlot] = useState<"price" | "maxAdvance" | "maxMonthly" | null>(
    null,
  );
  const [generation, setGeneration] = useState(0);
  const [pending, setPending] = useState<{ key: string; budget: Budget } | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const recognitionRef = useRef<Recognition | null>(null);
  const sequence = useRef(0);
  const alive = useRef(true);
  const busyRef = useRef(false);
  useEffect(() => {
    alive.current = true;
    return () => {
      alive.current = false;
      recognitionRef.current?.abort();
    };
  }, []);
  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, busy]);
  const push = (message: Omit<Message, "id">) =>
    setMessages((previous) => [...previous, { ...message, id: ++sequence.current }]);

  async function send(text = draft) {
    if (!text.trim() || busyRef.current) return;
    recognitionRef.current?.stop();
    setDraft("");
    push({ role: "user", text: text.trim() });
    let intent = parseMessage(text);
    const expected = memory.key === contextKey || pending?.key === contextKey ? awaitedSlot : null;
    const previousBudget = pending?.key === contextKey ? pending.budget : budget;
    if (expected && intent.action === "unknown") {
      const prefix = {
        price: "Машина стоит ",
        maxAdvance: "На аванс до ",
        maxMonthly: "Платеж до ",
      }[expected];
      const contextual = parseMessage(prefix + text);
      if (contextual[expected] !== undefined || contextual.clarification) intent = contextual;
    }
    if (intent.clarification) {
      setPending({ key: contextKey, budget: mergeBudget(previousBudget, intent) });
      setAwaitedSlot(intent.clarificationSlot ?? expected);
      setGeneration((value) => value + 1);
      push({ role: "assistant", text: intent.clarification });
      return;
    }
    if (intent.action === "explain") {
      push({
        role: "assistant",
        text: "Из стоимости автомобиля вычитаем первоначальный взнос. На оставшуюся сумму рассчитываем равные ежемесячные платежи по ставке выбранного срока. Более длинный срок может снизить платеж, но обычно увеличивает общую сумму процентов. Комиссии и страхование в этот расчет не входят.",
      });
      return;
    }
    if (intent.action === "unknown") {
      push({
        role: "assistant",
        text: "Помогу подобрать платеж, срок и аванс для выбранного автомобиля. Напишите, например: «До 350 тысяч в месяц, на аванс до 3 млн». Модель и продавца можно изменить в калькуляторе.",
      });
      return;
    }
    const requestGeneration = generation + 1;
    setGeneration(requestGeneration);
    setAwaitedSlot(null);
    setPending(null);
    const baselineRate = terms?.rates.find(
      (rate) => rate.months === context.months && rate.advancePercent === context.advancePercent,
    );
    const baseline =
      baselineRate && context.price ? calculateQuote(context.price, baselineRate) : null;
    const next = mergeBudget(
      {
        ...previousBudget,
        ...(!previousBudget.maxMonthly &&
          baseline &&
          (intent.action === "lower_payment" || intent.action === "lower_advance") && {
            maxMonthly: Math.ceil(baseline.monthlyPayment),
          }),
      },
      intent,
    );
    setMemory({ key: contextKey, budget: next });
    if (!next.price) {
      setAwaitedSlot("price");
      push({
        role: "assistant",
        text: "Какая стоимость автомобиля в предложении продавца? Напишите, например: «15 млн». Я использую вашу цену для расчета.",
      });
      return;
    }
    if (next.maxAdvance === undefined) {
      setAwaitedSlot("maxAdvance");
      push({
        role: "assistant",
        text: "Какую сумму готовы внести первоначально? Укажите лимит, например: «3 млн».",
      });
      return;
    }
    if (next.maxAdvance === 0) {
      push({
        role: "assistant",
        text: "В доступных условиях требуется первоначальный взнос. Подобрать вариант без аванса не получится. Укажите сумму, которую готовы внести, или уточните другой продукт у BCC Leasing.",
      });
      return;
    }
    if (!next.maxMonthly) {
      setAwaitedSlot("maxMonthly");
      push({
        role: "assistant",
        text: "Какой ежемесячный платеж вам комфортен? Например: «350 тысяч».",
      });
      return;
    }
    const maxMonthly = next.maxMonthly;
    const maxAdvance = next.maxAdvance;
    busyRef.current = true;
    setBusy(true);
    try {
      let data = terms;
      if (!data || next.clientType !== context.clientType) {
        const response = await fetch(
          appPath(`/api/terms?modelId=${context.modelId}&clientType=${next.clientType}`),
        );
        if (!response.ok) throw new Error("terms");
        data = (await response.json()) as TermsData;
      }
      if (!alive.current) return;
      if (!data.rates.length) {
        push({
          role: "assistant",
          text: "Для этой модели пока нет доступных условий расчета. Выберите другого продавца или модель в калькуляторе.",
        });
        return;
      }
      let offers = findOffers({
        price: next.price,
        rates: data.rates,
        limits: data.limits,
        maxMonthly: next.maxMonthly,
        maxAdvance: next.maxAdvance,
        lockedMonths: next.lockedMonths,
      });
      if (intent.action === "lower_payment")
        offers = offers
          .filter((offer) => !baseline || offer.monthlyPayment < baseline.monthlyPayment)
          .sort((a, b) => a.monthlyPayment - b.monthlyPayment);
      if (intent.action === "lower_advance")
        offers = offers
          .filter((offer) => !baseline || offer.advanceAmount < baseline.advanceAmount)
          .sort((a, b) => a.advanceAmount - b.advanceAmount || a.monthlyPayment - b.monthlyPayment);
      const distinct = offers
        .filter(
          (offer, index, all) =>
            all.findIndex(
              (other) =>
                other.rate.months === offer.rate.months &&
                other.rate.advancePercent === offer.rate.advancePercent,
            ) === index,
        )
        .slice(0, 3);
      const sourceNote =
        data.source === "snapshot"
          ? ` Расчет по сохраненным тарифам от ${dateLabel(data.checkedAt)}.`
          : "";
      if (distinct.length) {
        push({
          role: "assistant",
          text: `Для ${context.modelName} за ${money(next.price)} ${distinct.length === 1 ? "подходит такой вариант" : "подобрал варианты"}. Платеж до ${money(maxMonthly)}, аванс до ${money(maxAdvance)}.${sourceNote}`,
          offers: distinct,
          contextKey,
          budget: next,
          generation: requestGeneration,
        });
      } else {
        const withinAdvance = data.rates
          .filter(
            (rate) =>
              (!next.lockedMonths || rate.months === next.lockedMonths) &&
              isPriceAllowed(next.price, rate, data.limits),
          )
          .map((rate) => calculateQuote(next.price, rate))
          .filter((quote) => quote.advanceAmount <= maxAdvance)
          .sort((a, b) => a.monthlyPayment - b.monthlyPayment);
        const maximumPrice = estimateMaxPrice({
          rates: data.rates,
          limits: data.limits,
          maxMonthly: next.maxMonthly,
          maxAdvance: next.maxAdvance,
          lockedMonths: next.lockedMonths,
        });
        let explanation =
          intent.action === "lower_advance"
            ? "Снизить аванс при этих ограничениях не получается."
            : intent.action === "lower_payment"
              ? "Снизить платеж при этих ограничениях не получается."
              : `При цене ${money(next.price)} уложиться в эти ограничения не получается.`;
        if (withinAdvance[0])
          explanation += ` Минимальный расчетный платеж с вашим авансом: ${money(withinAdvance[0].monthlyPayment)} на ${withinAdvance[0].rate.months} мес.`;
        if (maximumPrice && maximumPrice < next.price)
          explanation += ` Можно рассмотреть стоимость до ${money(Math.floor(maximumPrice))}. Это ориентир бюджета, а не предложение автомобиля.`;
        else explanation += " Попробуйте увеличить доступный аванс или изменить срок.";
        push({ role: "assistant", text: explanation + sourceNote });
      }
    } catch {
      if (alive.current)
        push({
          role: "assistant",
          text: "Не удалось получить условия. Попробуйте еще раз или продолжите расчет в калькуляторе.",
        });
    } finally {
      busyRef.current = false;
      if (alive.current) setBusy(false);
    }
  }

  const proposalCurrent = (message: Message) =>
    message.contextKey === contextKey &&
    message.generation === generation &&
    JSON.stringify(message.budget) === JSON.stringify(budget);

  function toggleVoice() {
    setVoiceNotice("");
    if (listening) {
      recognitionRef.current?.stop();
      return;
    }
    const speechWindow = window as SpeechWindow;
    const RecognitionApi = speechWindow.SpeechRecognition || speechWindow.webkitSpeechRecognition;
    if (!RecognitionApi) {
      setVoiceNotice(
        "В этом браузере голосовой ввод недоступен. Используйте Chrome или напишите сообщение.",
      );
      return;
    }
    const recognition = new RecognitionApi();
    recognitionRef.current = recognition;
    recognition.lang = "ru-RU";
    recognition.continuous = false;
    recognition.interimResults = false;
    recognition.onresult = (event) => {
      if (alive.current) {
        setDraft(event.results[0][0].transcript);
        setVoiceNotice("Проверьте распознанный текст и нажмите отправить.");
        inputRef.current?.focus();
      }
    };
    recognition.onend = () => {
      if (alive.current) setListening(false);
    };
    recognition.onerror = (event) => {
      if (alive.current) {
        setListening(false);
        setVoiceNotice(
          event.error === "not-allowed"
            ? "Разрешите доступ к микрофону в браузере или введите текст."
            : "Не удалось распознать речь. Попробуйте еще раз или введите текст.",
        );
      }
    };
    try {
      recognition.start();
      setListening(true);
    } catch {
      setVoiceNotice("Не удалось включить микрофон. Введите сообщение текстом.");
    }
  }

  return (
    <Card size="m" type="primary" height="auto">
      <section aria-label="ИИ-помощник" className={s.body}>
        {/* Заголовок помощника */}
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
                Подберем условия под ваш бюджет
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
        <Flex gap={8} wrap>
          <Tag color="neutral" size="sm">
            {context.modelName}
          </Tag>
          <Tag color="neutral" size="sm">
            {context.price ? money(context.price) : "Стоимость не указана"}
          </Tag>
        </Flex>

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
                Какой платеж вам удобен?
              </Typography.Title>
              <Typography.Paragraph view="small" color="secondary">
                Расскажите о вашем бюджете. Подберу срок и первоначальный взнос для выбранного
                автомобиля.
              </Typography.Paragraph>
              <Flex wrap>
                <Chip
                  clickable
                  variant="inactive"
                  onClick={() => send("Хочу платить до 350 тысяч в месяц, на аванс до 3 млн")}
                >
                  До 350 000 ₸ в месяц
                </Chip>
                <Chip
                  clickable
                  variant="inactive"
                  onClick={() => send("Снизить первоначальный взнос")}
                >
                  Хочу снизить аванс
                </Chip>
                <Chip clickable variant="inactive" onClick={() => send("Как считается платеж?")}>
                  Как считается платеж?
                </Chip>
              </Flex>
            </Flex>
          )}
          {messages.map((message) => (
            <Flex
              key={message.id}
              direction="column"
              gap={8}
              className={message.role === "user" ? s.userMessage : s.assistantMessage}
            >
              <Typography.Paragraph view="small" className={s.bubble}>
                {message.text}
              </Typography.Paragraph>
              {message.offers?.map((offer, index) => (
                <Card size="s" type="secondary" key={`${offer.rate.rateId}:${index}`}>
                  <Flex direction="column" gap={12}>
                    <div>
                      <Tag
                        color="success"
                        size="sm"
                        leftIcon={<CheckOutlinedBold width={14} height={14} />}
                      >
                        {index === 0 ? "В вашем бюджете" : "Еще один вариант"}
                      </Tag>
                    </div>
                    <Flex alignItems="baseline" gap={8}>
                      <Typography.Paragraph view="xlarge" weight="bold" monospaceNumbers>
                        {money(offer.monthlyPayment)}
                      </Typography.Paragraph>
                      <Typography.Caption view="large" color="secondary">
                        в месяц
                      </Typography.Caption>
                    </Flex>
                    <dl className={s.offerDetails}>
                      <div>
                        <dt>
                          <Typography.Caption view="large" color="secondary">
                            Срок
                          </Typography.Caption>
                        </dt>
                        <dd>
                          <Typography.Paragraph view="small" weight="medium">
                            {offer.rate.months} месяцев
                          </Typography.Paragraph>
                        </dd>
                      </div>
                      <div>
                        <dt>
                          <Typography.Caption view="large" color="secondary">
                            Аванс
                          </Typography.Caption>
                        </dt>
                        <dd>
                          <Typography.Paragraph view="small" weight="medium" monospaceNumbers>
                            {money(offer.advanceAmount)} ({percent(offer.rate.advancePercent)}%)
                          </Typography.Paragraph>
                        </dd>
                      </div>
                    </dl>
                    <Typography.Caption view="large" color="secondary">
                      {offer.rate.months > context.months
                        ? `Срок больше на ${offer.rate.months - context.months} мес., общая сумма процентов может вырасти.`
                        : `Ставка ${percent(offer.rate.annualRate)}% годовых.`}
                    </Typography.Caption>
                    <Button
                      view="accentPrimary"
                      size="m"
                      fullWidth
                      disabled={!proposalCurrent(message) || busy}
                      onClick={() =>
                        onApply(offer, message.budget!.maxMonthly!, message.budget!.clientType)
                      }
                    >
                      {proposalCurrent(message)
                        ? "Применить условия"
                        : "Параметры изменились, повторите подбор"}
                    </Button>
                  </Flex>
                </Card>
              ))}
            </Flex>
          ))}
          {busy && (
            <Flex gap={8} alignItems="center" role="status">
              <Spinner size="sm" />
              <Typography.Caption view="large" color="secondary">
                Подбираю условия
              </Typography.Caption>
            </Flex>
          )}
        </div>

        {/* Бюджет и ввод сообщения */}
        <Flex direction="column" gap={12}>
          <div>
            <Button
              view="link"
              size="s"
              iconLeft={<Filter />}
              iconRight={showBudget ? <ChevronDirectionUp /> : <ChevronDirectionDown />}
              aria-expanded={showBudget}
              onClick={() => setShowBudget(!showBudget)}
            >
              Настроить бюджет
            </Button>
          </div>
          {showBudget && (
            <form
              onSubmit={(event) => {
                event.preventDefault();
                void send(
                  `До ${budget.maxMonthly} тенге в месяц, на аванс до ${budget.maxAdvance} тенге`,
                );
                setShowBudget(false);
              }}
            >
              <Flex direction="column" gap={12}>
                <Flex gap={12} direction={{ xxs: "column", xs: "row" }}>
                  <Flex grow basis={0} direction="column">
                    <MoneyInput
                      label="Платеж до"
                      value={budget.maxMonthly ?? 0}
                      onChange={(value) =>
                        setMemory({ key: contextKey, budget: { ...budget, maxMonthly: value } })
                      }
                    />
                  </Flex>
                  <Flex grow basis={0} direction="column">
                    <MoneyInput
                      label="Аванс до"
                      value={budget.maxAdvance ?? 0}
                      onChange={(value) =>
                        setMemory({ key: contextKey, budget: { ...budget, maxAdvance: value } })
                      }
                    />
                  </Flex>
                </Flex>
                <Button
                  view="accentSecondary"
                  size="m"
                  htmlType="submit"
                  fullWidth
                  disabled={busy || !budget.maxMonthly || budget.maxAdvance === undefined}
                >
                  Подобрать условия
                </Button>
              </Flex>
            </form>
          )}
          <form
            onSubmit={(event) => {
              event.preventDefault();
              void send();
            }}
          >
            <Flex direction="column" gap={8}>
              <Textarea
                ref={inputRef}
                fullWidth
                aria-label="Сообщение помощнику"
                rows={2}
                maxLength={1000}
                placeholder={listening ? "Слушаю вас…" : "Напишите или скажите…"}
                value={draft}
                onChange={(_, payload) => setDraft(payload.value)}
                onKeyDown={(event) => {
                  if (event.key === "Enter" && !event.shiftKey && !event.nativeEvent.isComposing) {
                    event.preventDefault();
                    void send();
                  }
                }}
              />
              <Flex justifyContent="space-between" alignItems="center" gap={8}>
                <Typography.Caption view="large" color="secondary">
                  {listening ? "Идет запись" : "Enter, чтобы отправить"}
                </Typography.Caption>
                <Flex gap={8}>
                  <Button
                    view={listening ? "destructiveSecondary" : "neutral"}
                    size="m"
                    iconLeft={listening ? <Pause /> : <Microphone />}
                    aria-label={listening ? "Остановить запись" : "Голосовой ввод"}
                    aria-pressed={listening}
                    disabled={busy}
                    onClick={toggleVoice}
                  />
                  <Button
                    view="accentPrimary"
                    size="m"
                    htmlType="submit"
                    iconLeft={<ArrowLineDirectionUp />}
                    aria-label="Отправить сообщение"
                    disabled={!draft.trim() || busy}
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
            Демо-режим. Предварительный расчет
          </Typography.Caption>
        </Flex>
      </section>
    </Card>
  );
}
