"use client";

import { appPath } from "@/lib/app-path";

import { Textarea } from "bcc-design";
import { Button } from "./ui";

import { useEffect, useRef, useState } from "react";
import {
  ArrowUp,
  Check,
  ChevronDown,
  Mic,
  SlidersHorizontal,
  Sparkles,
  Square,
  X,
} from "lucide-react";
import { parseMessage, type ParsedIntent } from "@/lib/assistant";
import { calculateQuote, estimateMaxPrice, findOffers, isPriceAllowed } from "@/lib/finance";
import { dateLabel, money, percent } from "@/lib/format";
import type { ClientType, Quote, TermsData } from "@/lib/types";
import { MoneyInput } from "./money-input";
import { AssistantMessage } from "./assistant-message";

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
        text: "Из стоимости автомобиля вычитаем **первоначальный взнос**. На оставшуюся сумму рассчитываем равные ежемесячные платежи по ставке выбранного срока. Более длинный срок может **снизить платеж**, но обычно **увеличивает общую сумму процентов**. Комиссии и страхование в этот расчет не входят.",
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
        text: "В доступных условиях **требуется первоначальный взнос**. Подобрать вариант без аванса не получится. Укажите сумму, которую готовы внести, или уточните другой продукт у BCC Leasing.",
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
          text: "Для этой модели пока нет доступных условий расчета. **Выберите другого продавца или модель** в калькуляторе.",
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
          ? ` Расчет по **сохраненным тарифам от ${dateLabel(data.checkedAt)}**.`
          : "";
      if (distinct.length) {
        push({
          role: "assistant",
          text: `Для ${context.modelName} за **${money(next.price)}** ${distinct.length === 1 ? "подходит такой вариант" : "подобрал варианты"}. Платеж — **до ${money(maxMonthly)}**, аванс — **до ${money(maxAdvance)}**.${sourceNote}`,
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
              : `При цене **${money(next.price)}** уложиться в эти ограничения не получается.`;
        if (withinAdvance[0])
          explanation += ` Минимальный расчетный платеж с вашим авансом — **${money(withinAdvance[0].monthlyPayment)}** на **${withinAdvance[0].rate.months} мес.**`;
        if (maximumPrice && maximumPrice < next.price)
          explanation += ` Можно рассмотреть **стоимость до ${money(Math.floor(maximumPrice))}**. Это ориентир бюджета, а не предложение автомобиля.`;
        else explanation += " Попробуйте **увеличить доступный аванс** или **изменить срок**.";
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
    <section className="assistant-panel panel" aria-label="ИИ-помощник">
      <div className="assistant-header">
        <div className="assistant-title">
          <span className="sparkle-tile">
            <Sparkles size={23} />
          </span>
          <div>
            <h2>ИИ-помощник</h2>
            <span>Подберем условия под ваш бюджет</span>
          </div>
        </div>
        <Button className="icon-button" onClick={onClose} aria-label="Закрыть помощника">
          <X size={21} />
        </Button>
      </div>
      <div className="assistant-context">
        <span>{context.modelName}</span>
        <span>{context.price ? money(context.price) : "Стоимость не указана"}</span>
      </div>
      <div ref={scrollRef} className="conversation" aria-live="polite" aria-relevant="additions">
        {!messages.length && (
          <div className="assistant-welcome">
            <span className="welcome-icon">
              <Sparkles size={25} />
            </span>
            <h3>Какой платеж вам удобен?</h3>
            <p>
              Расскажите о вашем бюджете. Подберу срок и первоначальный взнос для выбранного
              автомобиля.
            </p>
            <div className="prompt-list">
              <Button onClick={() => send("Хочу платить до 350 тысяч в месяц, на аванс до 3 млн")}>
                <span>До 350 000 ₸ в месяц</span>
                <ArrowUp size={16} />
              </Button>
              <Button onClick={() => send("Снизить первоначальный взнос")}>
                <span>Хочу снизить аванс</span>
                <ArrowUp size={16} />
              </Button>
              <Button onClick={() => send("Как считается платеж?")}>
                <span>Как считается платеж?</span>
                <ArrowUp size={16} />
              </Button>
            </div>
          </div>
        )}
        {messages.map((message) => (
          <div key={message.id} className={`message message-${message.role}`}>
            {message.role === "assistant" ? (
              <AssistantMessage text={message.text} />
            ) : (
              <p>{message.text}</p>
            )}
            {message.offers?.map((offer, index) => (
              <div className="offer-card" key={`${offer.rate.rateId}:${index}`}>
                <span className="offer-eyebrow">
                  <Check size={14} />
                  {index === 0 ? "В вашем бюджете" : "Еще один вариант"}
                </span>
                <div className="offer-amount">
                  {money(offer.monthlyPayment)}
                  <span>в месяц</span>
                </div>
                <dl className="offer-details">
                  <div>
                    <dt>Срок</dt>
                    <dd>{offer.rate.months} месяцев</dd>
                  </div>
                  <div>
                    <dt>Аванс</dt>
                    <dd>
                      {money(offer.advanceAmount)} · {percent(offer.rate.advancePercent)}%
                    </dd>
                  </div>
                </dl>
                <p className="offer-note">
                  {offer.rate.months > context.months
                    ? `Срок больше на ${offer.rate.months - context.months} мес. — общая сумма процентов может вырасти.`
                    : `Ставка ${percent(offer.rate.annualRate)}% годовых.`}
                </p>
                <Button
                  view="accentPrimary"
                  fullWidth
                  className="primary-button"
                  disabled={!proposalCurrent(message) || busy}
                  onClick={() =>
                    onApply(offer, message.budget!.maxMonthly!, message.budget!.clientType)
                  }
                >
                  {proposalCurrent(message)
                    ? "Применить условия"
                    : "Параметры изменились — повторите подбор"}
                </Button>
              </div>
            ))}
          </div>
        ))}
        {busy && (
          <div className="thinking">
            <span />
            <span />
            <span />
            <p>Подбираю условия</p>
          </div>
        )}
      </div>
      <div className="assistant-bottom">
        <Button
          className="budget-toggle"
          onClick={() => setShowBudget(!showBudget)}
          aria-expanded={showBudget}
        >
          <SlidersHorizontal size={15} /> Настроить бюджет
          <ChevronDown size={15} className={showBudget ? "rotated" : ""} />
        </Button>
        {showBudget && (
          <form
            className="budget-form"
            onSubmit={(event) => {
              event.preventDefault();
              void send(
                `До ${budget.maxMonthly} тенге в месяц, на аванс до ${budget.maxAdvance} тенге`,
              );
              setShowBudget(false);
            }}
          >
            <MoneyInput
              label="Платеж до"
              value={budget.maxMonthly ?? 0}
              onChange={(value) =>
                setMemory({ key: contextKey, budget: { ...budget, maxMonthly: value } })
              }
            />
            <MoneyInput
              label="Аванс до"
              value={budget.maxAdvance ?? 0}
              onChange={(value) =>
                setMemory({ key: contextKey, budget: { ...budget, maxAdvance: value } })
              }
            />
            <Button
              type="submit"
              view="accentSecondary"
              className="secondary-button"
              disabled={busy || !budget.maxMonthly || budget.maxAdvance === undefined}
            >
              Подобрать условия
            </Button>
          </form>
        )}
        <form
          className={`composer ${listening ? "is-listening" : ""}`}
          onSubmit={(event) => {
            event.preventDefault();
            void send();
          }}
        >
          <Textarea
            fullWidth
            showLettersLimit={false}
            ref={inputRef}
            aria-label="Сообщение помощнику"
            rows={2}
            maxLength={1000}
            placeholder={listening ? "Слушаю вас…" : "Напишите или скажите…"}
            value={draft}
            onChange={(event) => setDraft(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter" && !event.shiftKey && !event.nativeEvent.isComposing) {
                event.preventDefault();
                void send();
              }
            }}
          />
          <div className="composer-actions">
            <span>{listening ? "Идет запись" : "Enter — отправить"}</span>
            <Button
              type="button"
              className={`icon-button ${listening ? "recording" : ""}`}
              aria-label={listening ? "Остановить запись" : "Голосовой ввод"}
              aria-pressed={listening}
              onClick={toggleVoice}
              disabled={busy}
            >
              {listening ? <Square size={17} /> : <Mic size={20} />}
            </Button>
            <Button
              type="submit"
              view="accentPrimary"
              className="send-button"
              aria-label="Отправить сообщение"
              disabled={!draft.trim() || busy}
            >
              <ArrowUp size={22} />
            </Button>
          </div>
        </form>
        {voiceNotice && (
          <p className="voice-notice" role="status">
            {voiceNotice}
          </p>
        )}
        <p className="assistant-disclaimer">Демо-режим · Предварительный расчет</p>
      </div>
    </section>
  );
}
