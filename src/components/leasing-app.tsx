"use client";

import dynamic from "next/dynamic";
import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  ArrowRight,
  ArrowUpRight,
  CarFront,
  Check,
  CheckCheck,
  ChevronDown,
  ChevronRight,
  CircleHelp,
  FileText,
  Info,
  LoaderCircle,
  RefreshCw,
  ShieldCheck,
  Sparkles,
  Undo2,
  X,
} from "lucide-react";
import { calculateQuote, isPriceAllowed } from "@/lib/finance";
import { dateLabel, money, number, percent } from "@/lib/format";
import type { CatalogData, ClientType, LeaseRate, Quote, TermsData } from "@/lib/types";
import { AssistantPanel } from "./assistant-panel";
import { Dialog } from "./dialog";
import { ModelPicker, modelLabel } from "./model-picker";
import { MoneyInput } from "./money-input";

const ScheduleDialog = dynamic(
  () => import("./schedule-dialog").then((module) => module.ScheduleDialog),
  { ssr: false },
);
type FormState = {
  clientType: ClientType;
  modelId: number;
  price: number;
  advancePercent: number;
  months: number;
};
const initialForm: FormState = {
  clientType: "IP",
  modelId: 2875,
  price: 15000000,
  advancePercent: 20,
  months: 48,
};
type Applied = {
  previous: FormState;
  previousSample: boolean;
  previousQuote: Quote | null;
  nextKey: string;
  maxMonthly: number;
};
const formKey = (form: FormState) =>
  `${form.clientType}:${form.modelId}:${form.price}:${form.advancePercent}:${form.months}`;

function closestRate(rates: LeaseRate[], form: FormState) {
  return [...rates].sort(
    (a, b) =>
      Math.abs(a.advancePercent - form.advancePercent) -
        Math.abs(b.advancePercent - form.advancePercent) ||
      Math.abs(a.months - form.months) - Math.abs(b.months - form.months),
  )[0];
}

export function LeasingApp() {
  const [form, setForm] = useState<FormState>(initialForm);
  const [catalog, setCatalog] = useState<CatalogData | null>(null);
  const [catalogError, setCatalogError] = useState(false);
  const [loadedTerms, setLoadedTerms] = useState<{ key: string; data: TermsData } | null>(null);
  const [termsError, setTermsError] = useState("");
  const [retry, setRetry] = useState(0);
  const [assistantOpen, setAssistantOpen] = useState(false);
  const [modelPickerOpen, setModelPickerOpen] = useState(false);
  const [scheduleOpen, setScheduleOpen] = useState(false);
  const [continueOpen, setContinueOpen] = useState(false);
  const [sample, setSample] = useState(true);
  const [applied, setApplied] = useState<Applied | null>(null);
  const [faq, setFaq] = useState<number | null>(null);
  const assistantAnchor = useRef<HTMLDivElement>(null);
  const assistantButton = useRef<HTMLButtonElement>(null);
  const termsKey = `${form.modelId}:${form.clientType}:${retry}`;
  const terms = loadedTerms?.key === termsKey ? loadedTerms.data : null;
  const loading = !terms && termsError !== termsKey;

  useEffect(() => {
    const controller = new AbortController();
    fetch("/api/catalog", { signal: controller.signal })
      .then((response) => {
        if (!response.ok) throw new Error("catalog");
        return response.json() as Promise<CatalogData>;
      })
      .then((data) => {
        setCatalog(data);
        setCatalogError(false);
      })
      .catch((error) => {
        if (error.name !== "AbortError") setCatalogError(true);
      });
    return () => controller.abort();
  }, [retry]);

  useEffect(() => {
    const controller = new AbortController();
    fetch(`/api/terms?modelId=${form.modelId}&clientType=${form.clientType}`, {
      signal: controller.signal,
    })
      .then((response) => {
        if (!response.ok) throw new Error("terms");
        return response.json() as Promise<TermsData>;
      })
      .then((data) => {
        if (controller.signal.aborted) return;
        setLoadedTerms({ key: termsKey, data });
        setTermsError("");
        setForm((current) => {
          if (
            current.modelId !== form.modelId ||
            current.clientType !== form.clientType ||
            data.rates.some(
              (rate) =>
                rate.months === current.months && rate.advancePercent === current.advancePercent,
            )
          )
            return current;
          const selected = closestRate(data.rates, current);
          return selected
            ? { ...current, months: selected.months, advancePercent: selected.advancePercent }
            : current;
        });
      })
      .catch((error) => {
        if (error.name !== "AbortError") setTermsError(termsKey);
      });
    return () => controller.abort();
  }, [form.modelId, form.clientType, retry, termsKey]);

  const model = catalog?.models.find((item) => item.id === form.modelId);
  const title = modelLabel(model);
  const activeRate = terms?.rates.find(
    (rate) => rate.months === form.months && rate.advancePercent === form.advancePercent,
  );
  const limit = terms?.limits.find((item) => item.advancePercent === form.advancePercent);
  const quote = useMemo(
    () =>
      activeRate && form.price > 0 && terms && isPriceAllowed(form.price, activeRate, terms.limits)
        ? calculateQuote(form.price, activeRate)
        : null,
    [activeRate, form.price, terms],
  );
  const advances = [...new Set(terms?.rates.map((rate) => rate.advancePercent))].sort(
    (a, b) => a - b,
  );
  const months = [...new Set(terms?.rates.map((rate) => rate.months))].sort((a, b) => a - b);
  const isApplied = applied && applied.nextKey === formKey(form);
  const rangeMin = limit?.minPrice ?? 5000000;
  const rangeMax = limit?.maxPrice ?? 50000000;
  const rangeProgress = Math.max(
    0,
    Math.min(100, ((form.price - rangeMin) / (rangeMax - rangeMin)) * 100),
  );
  const costInvalid = Boolean(terms && activeRate && form.price > 0 && !quote);
  let validation = "";
  if (terms && !terms.rates.length)
    validation = "Для этой модели пока нет доступных условий. Выберите другую модель или продавца.";
  else if (costInvalid)
    validation = limit
      ? `При авансе ${form.advancePercent}% стоимость должна быть от ${money(limit.minPrice)} до ${money(limit.maxPrice)}.`
      : "Для этого аванса не удалось подтвердить допустимую стоимость.";

  function change(patch: Partial<FormState>) {
    setForm((current) => ({ ...current, ...patch }));
  }
  function openAssistant() {
    setAssistantOpen(true);
    requestAnimationFrame(() => {
      if (window.innerWidth < 900)
        assistantAnchor.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    });
  }
  function applyOffer(offer: Quote, maxMonthly: number, clientType: ClientType) {
    const next = {
      ...form,
      price: offer.price,
      clientType,
      advancePercent: offer.rate.advancePercent,
      months: offer.rate.months,
    };
    setApplied({
      previous: form,
      previousSample: sample,
      previousQuote: quote,
      nextKey: formKey(next),
      maxMonthly,
    });
    setForm(next);
    setAssistantOpen(false);
    if (offer.price !== form.price) setSample(false);
    requestAnimationFrame(() => assistantButton.current?.focus());
  }
  function setAdvance(advancePercent: number) {
    const allowed = terms?.rates.filter((rate) => rate.advancePercent === advancePercent) ?? [];
    const chosen =
      allowed.find((rate) => rate.months === form.months) ??
      [...allowed].sort(
        (a, b) => Math.abs(a.months - form.months) - Math.abs(b.months - form.months),
      )[0];
    change({ advancePercent, ...(chosen && { months: chosen.months }) });
  }
  function resetExample() {
    setForm(initialForm);
    setSample(true);
    setApplied(null);
    setAssistantOpen(false);
  }

  const questions = [
    {
      title: "Откуда взять стоимость автомобиля?",
      answer:
        "Укажите цену из предложения продавца или счета на оплату. Можно начать с ориентировочной суммы и уточнить ее позже. В этой версии сервис не определяет рыночную цену и не проверяет наличие автомобиля.",
    },
    {
      title: "Что делает помощник?",
      answer:
        "Помощник учитывает вашу цену, желаемый платеж и доступный аванс. Он сравнивает разрешенные сочетания срока и взноса. Предложенные условия попадут в калькулятор только после нажатия «Применить условия».",
    },
    {
      title: "Что входит в предварительный платеж?",
      answer:
        "Основной долг и проценты по аннуитетной формуле. Страхование, комиссии и другие расходы не включены. Окончательные условия и график определяются при оформлении договора.",
    },
  ];

  return (
    <>
      <a className="skip-link" href="#calculator">
        Перейти к калькулятору
      </a>
      <header className="site-header">
        <div className="header-inner">
          <Link href="/" className="brand" aria-label="BCC Leasing — главная">
            <span className="brand-mark">
              <i />
              <i />
              <i />
            </span>
            <span>
              BCC <strong>Leasing</strong>
            </span>
          </Link>
          <span className="header-divider" />
          <span className="header-description">Лизинг для бизнеса</span>
          <div className="header-right">
            <span className="demo-badge">Демо</span>
            <span className="language">Рус</span>
          </div>
        </div>
      </header>
      <main className="page-container" id="calculator">
        <nav aria-label="Навигационная цепочка" className="breadcrumb">
          <span>Лизинг</span>
          <ChevronRight size={13} />
          <span>Калькулятор</span>
        </nav>
        <div className="page-heading">
          <div>
            <h1>Калькулятор лизинга</h1>
            <p>Рассчитайте платеж и выберите удобные условия</p>
          </div>
          <button
            ref={assistantButton}
            className={`assistant-launch ${assistantOpen ? "active" : ""}`}
            onClick={() => (assistantOpen ? setAssistantOpen(false) : openAssistant())}
            aria-expanded={assistantOpen}
          >
            <Sparkles size={21} />
            {assistantOpen ? "Помощник открыт" : "Подобрать с ИИ"}
          </button>
        </div>
        {isApplied && (
          <div className="applied-banner" role="status">
            <CheckCheck size={19} />
            <span>
              Условия применены: {form.months} месяцев, аванс {percent(form.advancePercent)}%
            </span>
            <button
              onClick={() => {
                setForm(applied.previous);
                setSample(applied.previousSample);
                setApplied(null);
              }}
            >
              <Undo2 size={15} />
              Отменить
            </button>
            <button
              className="banner-close"
              aria-label="Скрыть уведомление"
              onClick={() => setApplied(null)}
            >
              <X size={16} />
            </button>
          </div>
        )}
        {(catalogError || termsError === termsKey) && (
          <div className="error-banner" role="alert">
            <Info size={18} />
            <span>Не удалось загрузить условия. Проверьте подключение и попробуйте снова.</span>
            <button onClick={() => setRetry((value) => value + 1)}>
              <RefreshCw size={15} />
              Повторить
            </button>
          </div>
        )}
        <div className="calculator-grid">
          <section className="form-panel panel" aria-labelledby="parameters-heading">
            <div className="panel-heading">
              <h2 id="parameters-heading">Параметры лизинга</h2>
              <span className="form-step">01 / 02</span>
            </div>
            <div className="client-row">
              <span className="field-label">Клиент</span>
              <div className="segmented-control" role="group" aria-label="Тип клиента">
                <button
                  aria-pressed={form.clientType === "IP"}
                  className={form.clientType === "IP" ? "selected" : ""}
                  onClick={() => change({ clientType: "IP" })}
                >
                  ИП
                </button>
                <button
                  aria-pressed={form.clientType === "TOO"}
                  className={form.clientType === "TOO" ? "selected" : ""}
                  onClick={() => change({ clientType: "TOO" })}
                >
                  ТОО
                </button>
              </div>
            </div>
            {form.clientType === "TOO" && (
              <p className="too-note">
                Обычный лизинг для ТОО со сроком деятельности более 1 года.
              </p>
            )}
            <div className="field-group vehicle-group">
              <label className="field-label" htmlFor="vehicle-button">
                Автомобиль
              </label>
              <button
                id="vehicle-button"
                className="vehicle-button"
                onClick={() => setModelPickerOpen(true)}
                disabled={!catalog}
              >
                <CarFront size={22} />
                <span>{catalog ? title : "Загружаем модели…"}</span>
                <ChevronDown size={20} />
              </button>
              <p className="field-hint">{model?.partnerName ?? "Справочник моделей и продавцов"}</p>
            </div>
            <div className="field-group price-group">
              <MoneyInput
                label="Стоимость автомобиля"
                value={form.price}
                onChange={(price) => {
                  change({ price });
                  setSample(false);
                }}
                placeholder="Укажите стоимость"
                invalid={costInvalid}
              />
              <div className="slider-wrap">
                <input
                  type="range"
                  aria-label="Стоимость автомобиля — ползунок"
                  min={rangeMin}
                  max={rangeMax}
                  step={50000}
                  value={Math.max(rangeMin, Math.min(rangeMax, form.price || rangeMin))}
                  onChange={(event) => {
                    change({ price: Number(event.target.value) });
                    setSample(false);
                  }}
                  style={{ "--range-progress": `${rangeProgress}%` } as React.CSSProperties}
                  disabled={!activeRate}
                />
              </div>
              <div className="range-labels">
                <span>{number(rangeMin)} ₸</span>
                <span>{number(rangeMax)} ₸</span>
              </div>
              <p className="field-hint">
                {sample ? (
                  <>
                    <span className="example-dot" /> Для примера указано 15 млн ₸. Введите цену от
                    продавца.
                  </>
                ) : (
                  "Укажите цену из предложения продавца или счета."
                )}
              </p>
            </div>
            <div className="field-group">
              <label className="field-label" htmlFor="advance-select">
                Первоначальный взнос
              </label>
              <div className="advance-row">
                <div className="computed-field">
                  <span>{money(Math.round((form.price * form.advancePercent) / 100))}</span>
                </div>
                <div className="select-wrap">
                  <select
                    id="advance-select"
                    value={form.advancePercent}
                    onChange={(event) => setAdvance(Number(event.target.value))}
                    disabled={!terms?.rates.length}
                  >
                    {(advances.length ? advances : [form.advancePercent]).map((advance) => (
                      <option key={advance} value={advance}>
                        {percent(advance)}%
                      </option>
                    ))}
                  </select>
                  <ChevronDown size={18} />
                </div>
              </div>
              <p className="field-hint">Сумма рассчитывается от стоимости автомобиля</p>
            </div>
            <div className="field-group term-group">
              <span className="field-label" id="term-label">
                Срок лизинга
              </span>
              <div className="term-options" role="group" aria-labelledby="term-label">
                {(months.length ? months : [37, 48, 60]).map((month) => {
                  const available = terms?.rates.some(
                    (rate) => rate.months === month && rate.advancePercent === form.advancePercent,
                  );
                  return (
                    <button
                      key={month}
                      aria-pressed={form.months === month}
                      className={form.months === month ? "selected" : ""}
                      disabled={!available}
                      onClick={() => change({ months: month })}
                    >
                      {month} <span>мес.</span>
                    </button>
                  );
                })}
              </div>
            </div>
            {validation && (
              <p className="validation-message" role="alert">
                <Info size={17} />
                {validation}
              </p>
            )}
            <div className="form-bottom">
              <span className={`source-status ${terms?.source === "snapshot" ? "snapshot" : ""}`}>
                {loading ? (
                  <LoaderCircle size={14} className="spin" />
                ) : (
                  <span className="status-dot" />
                )}
                {loading
                  ? "Получаем условия"
                  : terms
                    ? terms.source === "live"
                      ? "Условия обновлены"
                      : `Тарифы от ${dateLabel(terms.checkedAt)}`
                    : "Условия недоступны"}
              </span>
              <button className="text-button muted" onClick={resetExample}>
                <RefreshCw size={13} />
                Пример расчета
              </button>
            </div>
          </section>
          <div className="right-column" ref={assistantAnchor}>
            {assistantOpen ? (
              <AssistantPanel
                key={`${form.modelId}:${form.clientType}`}
                context={{ ...form, modelName: title }}
                terms={terms}
                onClose={() => {
                  setAssistantOpen(false);
                  assistantButton.current?.focus();
                }}
                onApply={applyOffer}
              />
            ) : (
              <section className="summary-panel panel" aria-labelledby="summary-heading">
                <div className="summary-topline">
                  <h2 id="summary-heading">Ваш расчет</h2>
                  <span className="summary-icon">
                    <FileText size={20} />
                  </span>
                </div>
                {loading ? (
                  <div className="summary-loading" role="status">
                    <div className="skeleton amount-skeleton" />
                    <div className="skeleton short-skeleton" />
                    <p>Рассчитываем платеж…</p>
                  </div>
                ) : quote ? (
                  <>
                    <div className="monthly-payment" aria-live="polite">
                      <strong data-testid="monthly-payment">{money(quote.monthlyPayment)}</strong>
                      <span>ежемесячный платеж</span>
                    </div>
                    {isApplied && quote.monthlyPayment <= applied.maxMonthly && (
                      <span className="budget-badge">
                        <Check size={14} />В бюджете до {money(applied.maxMonthly)}
                      </span>
                    )}
                    <div className="summary-rule" />
                    <dl className="summary-details">
                      <div>
                        <dt>Стоимость автомобиля</dt>
                        <dd>{money(form.price)}</dd>
                      </div>
                      <div>
                        <dt>
                          Первоначальный взнос <span>· {percent(form.advancePercent)}%</span>
                        </dt>
                        <dd>{money(quote.advanceAmount)}</dd>
                      </div>
                      <div className="financing-row">
                        <dt>Сумма финансирования</dt>
                        <dd>{money(quote.principal)}</dd>
                      </div>
                      <div>
                        <dt>Срок лизинга</dt>
                        <dd>{form.months} месяцев</dd>
                      </div>
                      <div>
                        <dt>Годовая ставка</dt>
                        <dd>{percent(quote.rate.annualRate)}%</dd>
                      </div>
                    </dl>
                    {isApplied && applied.previousQuote && (
                      <div className="comparison">
                        <CheckCheck size={17} />
                        <div>
                          Было {money(applied.previousQuote.monthlyPayment)} при сроке{" "}
                          {applied.previous.months} мес.
                          <span>
                            {form.months > applied.previous.months
                              ? `${quote.monthlyPayment < applied.previousQuote.monthlyPayment ? "Платеж ниже" : quote.monthlyPayment > applied.previousQuote.monthlyPayment ? "Платеж выше" : "Платеж прежний"}, срок больше на ${form.months - applied.previous.months} мес.`
                              : "Условия обновлены по вашему бюджету"}
                          </span>
                        </div>
                      </div>
                    )}
                    <button className="schedule-link" onClick={() => setScheduleOpen(true)}>
                      <FileText size={17} />
                      Показать график платежей
                      <ArrowUpRight size={17} />
                    </button>
                    <button
                      className="primary-button continue-button"
                      onClick={() => setContinueOpen(true)}
                    >
                      Продолжить оформление
                      <ArrowRight size={19} />
                    </button>
                    <p className="summary-disclaimer">
                      Предварительный расчет. Без страхования и дополнительных расходов. Не является
                      офертой.
                    </p>
                  </>
                ) : (
                  <div className="summary-empty">
                    <span>
                      <FileText size={29} />
                    </span>
                    <h3>{form.price ? "Проверьте параметры" : "Начните со стоимости"}</h3>
                    <p>
                      {form.price
                        ? validation || "Загрузите доступные условия, чтобы увидеть расчет."
                        : "Укажите цену автомобиля от продавца — здесь появится ваш платеж."}
                    </p>
                  </div>
                )}
                <div className="summary-trust">
                  <ShieldCheck size={16} />
                  <span>Расчет без заявки и персональных данных</span>
                </div>
              </section>
            )}
            {!assistantOpen && (
              <button className="assistant-teaser" onClick={openAssistant}>
                <span className="teaser-icon">
                  <Sparkles size={22} />
                </span>
                <span>
                  <strong>Есть комфортный платеж?</strong>
                  <small>Помощник подберет срок и аванс</small>
                </span>
                <ArrowUpRight size={19} />
              </button>
            )}
          </div>
        </div>
        <section className="how-it-works" aria-label="Как это работает">
          <div>
            <span>1</span>
            <p>
              <strong>Укажите стоимость</strong>
              <small>Из предложения вашего продавца</small>
            </p>
          </div>
          <ChevronRight className="step-chevron" size={17} />
          <div>
            <span>2</span>
            <p>
              <strong>Подберите условия</strong>
              <small>Самостоятельно или с помощником</small>
            </p>
          </div>
          <ChevronRight className="step-chevron" size={17} />
          <div>
            <span>3</span>
            <p>
              <strong>Перейдите к заявке</strong>
              <small>Когда будете готовы к оформлению</small>
            </p>
          </div>
        </section>
        <section className="faq-section">
          <div className="faq-title">
            <CircleHelp size={20} />
            <h2>Полезно знать</h2>
          </div>
          <div className="faq-list">
            {questions.map((question, index) => (
              <div className="faq-item" key={question.title}>
                <button
                  onClick={() => setFaq(faq === index ? null : index)}
                  aria-expanded={faq === index}
                  aria-controls={`faq-${index}`}
                >
                  {question.title}
                  <ChevronDown size={17} className={faq === index ? "rotated" : ""} />
                </button>
                <div id={`faq-${index}`} hidden={faq !== index}>
                  <p>{question.answer}</p>
                </div>
              </div>
            ))}
          </div>
        </section>
        <footer className="page-footer">
          <span>© {new Date().getFullYear()} BCC Leasing</span>
          <span>Демонстрационная версия · Обычный автолизинг</span>
        </footer>
      </main>
      {modelPickerOpen && catalog && (
        <ModelPicker
          models={catalog.models}
          selected={form.modelId}
          onClose={() => setModelPickerOpen(false)}
          onSelect={(selected) => {
            if (selected.id !== form.modelId) {
              change({ modelId: selected.id, price: 0 });
              setSample(false);
            }
            setModelPickerOpen(false);
            setApplied(null);
          }}
        />
      )}
      {scheduleOpen && quote && (
        <ScheduleDialog quote={quote} model={title} onClose={() => setScheduleOpen(false)} />
      )}
      {continueOpen && quote && (
        <Dialog title="Ваш расчет готов" onClose={() => setContinueOpen(false)}>
          <div className="handoff-icon">
            <Check size={27} />
          </div>
          <p className="dialog-intro">
            {title} · {money(form.price)}
          </p>
          <div className="handoff-payment">
            <strong>{money(quote.monthlyPayment)}</strong>
            <span>в месяц на {form.months} мес.</span>
          </div>
          <dl className="summary-details">
            <div>
              <dt>Первоначальный взнос</dt>
              <dd>{money(quote.advanceAmount)}</dd>
            </div>
            <div>
              <dt>Тип клиента</dt>
              <dd>{form.clientType === "IP" ? "ИП" : "ТОО"}</dd>
            </div>
          </dl>
          <div className="handoff-note">
            <Info size={18} />
            <p>
              Оформление продолжится в сервисе BCC Leasing. Автоматический перенос расчета пока не
              подключен — параметры потребуется указать повторно.
            </p>
          </div>
          <a
            className="primary-button"
            href="https://business.bcc.kz/online-leasing/"
            target="_blank"
            rel="noreferrer"
          >
            Открыть заявку BCC
            <ArrowUpRight size={18} />
          </a>
          <button className="text-button handoff-back" onClick={() => setContinueOpen(false)}>
            Вернуться к расчету
          </button>
        </Dialog>
      )}
    </>
  );
}
