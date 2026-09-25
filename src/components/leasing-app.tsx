"use client";

import { appPath } from "@/lib/app-path";

import dynamic from "next/dynamic";
import Image from "next/image";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  Accordion,
  Alert,
  Breadcrumbs,
  Button,
  Card,
  Chip,
  Container,
  Divider,
  Flex,
  Input,
  Select,
  Slider,
  Skeleton,
  Spinner,
  StepperDesktop,
  Tag,
  Typography,
} from "bcc-design";
import ArrowDirectionRight from "bcc-design-icons/base/Arrows/ArrowDirectionRight";
import Fullscreen from "bcc-design-icons/base/Arrows/Fullscreen";
import Refresh from "bcc-design-icons/base/Arrows/Refresh";
import CheckOutlinedBold from "bcc-design-icons/base/Basic/CheckOutlinedBold";
import Chat from "bcc-design-icons/base/Communication/Chat";
import Document from "bcc-design-icons/base/FilesDocuments/Document";
import Shield from "bcc-design-icons/base/Security/Shield";
import Moon from "bcc-design-icons/base/Weather/Moon";
import Sun from "bcc-design-icons/base/Weather/Sun";
import { calculateQuote, isPriceAllowed } from "@/lib/finance";
import { dateLabel, money, number, percent } from "@/lib/format";
import type { CatalogData, ClientType, LeaseRate, Quote, TermsData } from "@/lib/types";
import { useColorMode } from "@/app/providers";
import { AssistantPanel } from "./assistant-panel";
import { ModelPicker, modelLabel } from "./model-picker";
import { MoneyInput } from "./money-input";
import faqIllustration from "./assets/faq-question.png";
import leasingLogo from "./assets/bcc-leasing-logo.png";
import s from "./leasing-app.module.scss";

const ScheduleDialog = dynamic(
  () => import("./schedule-dialog").then((module) => module.ScheduleDialog),
  { ssr: false },
);
const ScoringDialog = dynamic(
  () => import("./scoring-dialog").then((module) => module.ScoringDialog),
  { ssr: false },
);
const ProposalDialog = dynamic(
  () => import("./proposal-dialog").then((module) => module.ProposalDialog),
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

const clientOptions: { value: ClientType; label: string }[] = [
  { value: "IP", label: "ИП" },
  { value: "TOO", label: "ТОО" },
];
const breadcrumbs = [
  { id: 1, title: "Лизинг", link: appPath("/") },
  { id: 2, title: "Калькулятор", link: appPath("/") },
];
const steps = [
  { title: "Укажите стоимость", description: "Из предложения вашего продавца" },
  { title: "Подберите условия", description: "Самостоятельно или с помощником" },
  { title: "Перейдите к заявке", description: "Когда будете готовы к оформлению" },
];
const questions = [
  {
    id: "price",
    title: "Откуда взять стоимость автомобиля?",
    detail:
      "Укажите цену из предложения продавца или счета на оплату. Можно начать с ориентировочной суммы и уточнить ее позже. В этой версии сервис не определяет рыночную цену и не проверяет наличие автомобиля.",
  },
  {
    id: "assistant",
    title: "Что делает помощник?",
    detail:
      "Помощник учитывает вашу цену, желаемый платеж и доступный аванс. Он сравнивает разрешенные сочетания срока и взноса. Предложенные условия попадут в калькулятор только после нажатия «Применить условия».",
  },
  {
    id: "payment",
    title: "Что входит в предварительный платеж?",
    detail:
      "Основной долг и проценты по аннуитетной формуле. Страхование, комиссии и другие расходы не включены. Окончательные условия и график определяются при оформлении договора.",
  },
];

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
  const [proposalKey, setProposalKey] = useState<string | null>(null);
  const [scheduleOpen, setScheduleOpen] = useState(false);
  const [continueOpen, setContinueOpen] = useState(false);
  const [sample, setSample] = useState(true);
  const [applied, setApplied] = useState<Applied | null>(null);
  const assistantAnchor = useRef<HTMLDivElement>(null);
  const colorMode = useColorMode();
  const headerRef = useRef<HTMLDivElement>(null);
  const heroRef = useRef<HTMLDivElement>(null);
  const fullscreen = useFullscreen();

  useEffect(() => {
    const header = headerRef.current;
    const hero = heroRef.current;
    if (!header || !hero) return;
    let frame = 0;
    const update = () => {
      frame = 0;
      // Шапка: полный эффект после прокрутки на 240px. Баннер: прогресс от 0 до 1,
      // пока он уходит за верх окна.
      header.style.setProperty("--header-progress", String(Math.min(window.scrollY / 240, 1)));
      hero.style.setProperty(
        "--hero-progress",
        String(Math.min(window.scrollY / Math.max(hero.offsetHeight, 1), 1)),
      );
    };
    const onScroll = () => {
      if (!frame) frame = requestAnimationFrame(update);
    };
    update();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    return () => {
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
      cancelAnimationFrame(frame);
    };
  }, []);
  const termsKey = `${form.modelId}:${form.clientType}:${retry}`;
  const terms = loadedTerms?.key === termsKey ? loadedTerms.data : null;
  const loading = !terms && termsError !== termsKey;
  // Первая загрузка приложения: ждем каталог и первые тарифы. Пока идет — вместо
  // полей и расчета показываем скелетон; при ошибке — сразу обычный экран с баннером.
  const booting = !catalogError && termsError !== termsKey && (!catalog || loadedTerms === null);

  useEffect(() => {
    const controller = new AbortController();
    fetch(appPath("/api/catalog"), { signal: controller.signal })
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
    fetch(appPath(`/api/terms?modelId=${form.modelId}&clientType=${form.clientType}`), {
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
  const currentProposalKey =
    quote && model && !catalogError
      ? JSON.stringify([formKey(form), quote, model, termsKey])
      : null;
  // Invalidate the open preview permanently, including change-and-revert.
  if (proposalKey !== null && proposalKey !== currentProposalKey) setProposalKey(null);
  // Шаг 1 — пока нет расчета, шаг 2 — расчет есть и можно подбирать условия.
  const currentStep = quote ? 2 : 1;
  const advances = [...new Set(terms?.rates.map((rate) => rate.advancePercent))].sort(
    (a, b) => a - b,
  );
  const months = [...new Set(terms?.rates.map((rate) => rate.months))].sort((a, b) => a - b);
  const isApplied = applied && applied.nextKey === formKey(form);
  const rangeMin = limit?.minPrice ?? 5000000;
  const rangeMax = limit?.maxPrice ?? 50000000;
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
      if (window.innerWidth < 992)
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

  return (
    <>
      <a className="skip-link" href="#calculator">
        Перейти к калькулятору
      </a>
      {/* Шапка */}
      {/* Шапка: липкий слой поверх баннера и страницы. Подложка плашки становится
          плотнее и сильнее размывает фон по мере прокрутки (--header-progress 0…1,
          пишется из обработчика scroll без перерисовки React). Шапка — часть баннера
          по стилю, поэтому всегда в светлой теме. */}
      <div ref={headerRef} className={`${s.headerSticky} bcc-root_theme_bcc-leasing-light`}>
        <Container maxWidth={1280} gutters={24}>
          {/* HeaderDesktop не подошел: он всегда резервирует справа пустой блок
              пользователя и на мобиле обрезает левую часть. */}
          <Flex as="header" alignItems="center" gap={16} className={s.headerBar}>
            {/* Логотипа BCC Leasing в DS нет — используем фирменный файл. Шапка всегда
                светлая, поэтому один вариант логотипа подходит для обеих тем. */}
            <Image src={leasingLogo} alt="BCC Leasing" priority className={s.logo} />
            <Divider orientation="vertical" noGap height={24} className={s.headerCaption} />
            <Typography.Paragraph view="medium" color="secondary" className={s.headerCaption}>
              Лизинг для бизнеса
            </Typography.Paragraph>
            <Tag color="info" variant="default" size="sm">
              Демо
            </Tag>
            <Button
              view="neutral"
              size="m"
              iconLeft={colorMode.mode === "dark" ? <Sun /> : <Moon />}
              aria-label={
                colorMode.mode === "dark" ? "Включить светлую тему" : "Включить темную тему"
              }
              onClick={colorMode.toggle}
            />
            {fullscreen.supported && (
              <Button
                view={fullscreen.active ? "neutralFilledSecondary" : "neutral"}
                size="m"
                iconLeft={<Fullscreen />}
                aria-label={
                  fullscreen.active ? "Выйти из полноэкранного режима" : "Открыть на весь экран"
                }
                aria-pressed={fullscreen.active}
                onClick={fullscreen.toggle}
              />
            )}
          </Flex>
        </Container>
      </div>
      {/* Баннер во всю ширину окна, как на bccleasing.kz: текст выровнен по колонке
          контента (тот же Container). Картинка светлая, поэтому баннер всегда в светлой
          теме: класс темы DS переопределяет токены только внутри него. */}
      <div ref={heroRef} className={`${s.hero} bcc-root_theme_bcc-leasing-light`}>
        <Container maxWidth={1280} gutters={24} className={s.heroInner}>
          <Flex direction="column" gap={24} className={s.heroContent}>
            <div className={s.breadcrumbs}>
              <Breadcrumbs breadcrumbs={breadcrumbs} size="sm" />
            </div>
            <Flex direction="column" gap={8}>
              <Typography.Title tag="h1">Калькулятор лизинга</Typography.Title>
              <Typography.Paragraph view="large" color="secondary">
                Рассчитайте платеж и выберите удобные условия
              </Typography.Paragraph>
            </Flex>
            <div>
              <Button
                view="accentPrimary"
                size="l"
                iconLeft={<Chat />}
                aria-expanded={assistantOpen}
                onClick={() => (assistantOpen ? setAssistantOpen(false) : openAssistant())}
              >
                {assistantOpen ? "Помощник открыт" : "Подобрать с ИИ"}
              </Button>
            </div>
          </Flex>
        </Container>
      </div>
      <main id="calculator" aria-busy={booting}>
        <Container maxWidth={1280} gutters={24} className={s.page}>
          {isApplied && (
            <Alert
              variant="success"
              fullWidth
              hasCloser
              autoCloseDelay={null}
              title={`Условия применены: ${form.months} месяцев, аванс ${percent(form.advancePercent)}%`}
              actionButtonText="Отменить"
              actionButtonHandler={() => {
                setForm(applied.previous);
                setSample(applied.previousSample);
                setApplied(null);
              }}
              onClose={() => setApplied(null)}
            />
          )}
          {(catalogError || termsError === termsKey) && (
            <Alert
              variant="error"
              fullWidth
              autoCloseDelay={null}
              title="Не удалось загрузить условия. Проверьте подключение и попробуйте снова."
              actionButtonText="Повторить"
              actionButtonHandler={() => setRetry((value) => value + 1)}
            />
          )}

          <div className={s.grid}>
            {/* Параметры лизинга */}
            <Card size="m" type="primary" height="auto">
              <section aria-labelledby="parameters-heading">
                <Flex direction="column" gap={24}>
                  <Typography.Title
                    tag="div"
                    view="block"
                    role="heading"
                    aria-level={2}
                    id="parameters-heading"
                  >
                    Параметры лизинга
                  </Typography.Title>

                  <Flex direction="column" gap={8}>
                    <Typography.Paragraph view="small" color="secondary" id="client-label">
                      Клиент
                    </Typography.Paragraph>
                    <ChoiceChips
                      labelledBy="client-label"
                      options={clientOptions}
                      value={form.clientType}
                      loading={booting}
                      onChange={(clientType) => change({ clientType })}
                    />
                    {form.clientType === "TOO" && (
                      <Typography.Caption view="large" color="secondary">
                        Обычный лизинг для ТОО со сроком деятельности более 1 года.
                      </Typography.Caption>
                    )}
                  </Flex>

                  {booting ? (
                    <FieldSkeleton hint="Справочник моделей и продавцов" />
                  ) : (
                    <ModelPicker
                      models={catalog?.models ?? []}
                      selected={form.modelId}
                      loading={!catalog}
                      onSelect={(selected) => {
                        if (selected.id !== form.modelId) {
                          change({ modelId: selected.id, price: 0 });
                          setSample(false);
                        }
                        setApplied(null);
                      }}
                    />
                  )}

                  <Flex direction="column" gap={12}>
                    {booting ? (
                      <FieldSkeleton hint="Для примера указано 15 млн ₸. Введите цену от продавца." />
                    ) : (
                      <MoneyInput
                        label="Стоимость автомобиля"
                        value={form.price}
                        placeholder="Укажите стоимость"
                        error={costInvalid}
                        hint={
                          sample
                            ? "Для примера указано 15 млн ₸. Введите цену от продавца."
                            : "Укажите цену из предложения продавца или счета."
                        }
                        onChange={(price) => {
                          change({ price });
                          setSample(false);
                        }}
                      />
                    )}
                    {booting ? (
                      <SliderSkeleton />
                    ) : (
                      <>
                        <div className={s.priceSlider}>
                          <Slider
                            aria-label="Стоимость автомобиля, ползунок"
                            min={rangeMin}
                            max={rangeMax}
                            step={50000}
                            value={Math.max(rangeMin, Math.min(rangeMax, form.price || rangeMin))}
                            disabled={!activeRate}
                            onUpdate={(value) => {
                              if (typeof value !== "number") return;
                              change({ price: value });
                              setSample(false);
                            }}
                          />
                        </div>
                        <Flex justifyContent="space-between">
                          <Typography.Caption view="large" color="secondary" monospaceNumbers>
                            {number(rangeMin)} ₸
                          </Typography.Caption>
                          <Typography.Caption
                            className={s.end}
                            view="large"
                            color="secondary"
                            monospaceNumbers
                          >
                            {number(rangeMax)} ₸
                          </Typography.Caption>
                        </Flex>
                      </>
                    )}
                  </Flex>

                  {booting ? (
                    <div className={s.advanceRow}>
                      <FieldSkeleton hint="Сумма рассчитывается от стоимости автомобиля" />
                      <FieldSkeleton />
                    </div>
                  ) : (
                    <div className={s.advanceRow}>
                      <Flex direction="column">
                        <Input
                          fullWidth
                          size="lg"
                          readOnly
                          label="Первоначальный взнос"
                          value={money(Math.round((form.price * form.advancePercent) / 100))}
                          hint="Сумма рассчитывается от стоимости автомобиля"
                        />
                      </Flex>
                      <div>
                        <Select
                          fullWidth
                          size="lg"
                          label="Аванс"
                          mobileTitle="Первоначальный взнос"
                          options={(advances.length ? advances : [form.advancePercent]).map(
                            (advance) => ({ value: advance, label: `${percent(advance)}%` }),
                          )}
                          value={form.advancePercent}
                          disabled={!terms?.rates.length}
                          onChange={({ value }) => {
                            if (typeof value === "number") setAdvance(value);
                          }}
                        />
                      </div>
                    </div>
                  )}

                  <Flex direction="column" gap={8}>
                    <Typography.Paragraph view="small" color="secondary" id="term-label">
                      Срок лизинга
                    </Typography.Paragraph>
                    <ChoiceChips
                      labelledBy="term-label"
                      options={(months.length ? months : [37, 48, 60]).map((month) => ({
                        value: month,
                        label: `${month} мес.`,
                        disabled: !terms?.rates.some(
                          (rate) =>
                            rate.months === month && rate.advancePercent === form.advancePercent,
                        ),
                      }))}
                      value={form.months}
                      loading={booting}
                      onChange={(months) => change({ months })}
                    />
                  </Flex>

                  {validation && (
                    <Alert variant="warning" fullWidth autoCloseDelay={null} title={validation} />
                  )}

                  <Divider noGap />
                  <Flex justifyContent="space-between" alignItems="center" gap={16} wrap>
                    <Tag
                      size="sm"
                      color={
                        loading
                          ? "neutral"
                          : !terms
                            ? "error"
                            : terms.source === "snapshot"
                              ? "warning"
                              : "success"
                      }
                      leftIcon={loading ? <Spinner size="xs" /> : undefined}
                    >
                      {loading
                        ? "Получаем условия"
                        : terms
                          ? terms.source === "live"
                            ? "Условия обновлены"
                            : `Тарифы от ${dateLabel(terms.checkedAt)}`
                          : "Условия недоступны"}
                    </Tag>
                    <Button view="link" size="s" iconLeft={<Refresh />} onClick={resetExample}>
                      Пример расчета
                    </Button>
                  </Flex>
                </Flex>
              </section>
            </Card>

            {/* Ваш расчет или помощник */}
            <div className={s.side} ref={assistantAnchor}>
              {assistantOpen ? (
                <AssistantPanel
                  key={`${form.modelId}:${form.clientType}`}
                  context={{ ...form, modelName: title }}
                  terms={terms}
                  onClose={() => setAssistantOpen(false)}
                  onApply={applyOffer}
                />
              ) : (
                <>
                  <Card size="m" type="primary" height="auto">
                    <section aria-labelledby="summary-heading">
                      <Flex direction="column" gap={24}>
                        <Flex justifyContent="space-between" alignItems="center" gap={16}>
                          <Typography.Title
                            tag="div"
                            view="block"
                            role="heading"
                            aria-level={2}
                            id="summary-heading"
                          >
                            Ваш расчет
                          </Typography.Title>
                          <Document className={s.mutedIcon} />
                        </Flex>
                        {booting ? (
                          <SummarySkeleton />
                        ) : loading ? (
                          <Flex direction="column" gap={8} role="status">
                            <Typography.Title tag="div" view="page" showSkeleton>
                              392 218 ₸
                            </Typography.Title>
                            <Typography.Paragraph view="small" color="secondary">
                              Рассчитываем платеж…
                            </Typography.Paragraph>
                          </Flex>
                        ) : quote ? (
                          <>
                            <Flex direction="column" gap={8} aria-live="polite">
                              <Typography.Title tag="div" view="page" data-testid="monthly-payment">
                                {money(quote.monthlyPayment)}
                              </Typography.Title>
                              <Typography.Paragraph view="medium" color="secondary">
                                ежемесячный платеж
                              </Typography.Paragraph>
                              {isApplied && quote.monthlyPayment <= applied.maxMonthly && (
                                <div>
                                  <Tag
                                    color="success"
                                    size="sm"
                                    leftIcon={<CheckOutlinedBold width={14} height={14} />}
                                  >
                                    В бюджете до {money(applied.maxMonthly)}
                                  </Tag>
                                </div>
                              )}
                            </Flex>
                            <Divider noGap />
                            <dl className={s.details}>
                              <Detail label="Стоимость автомобиля" value={money(form.price)} />
                              <Detail
                                label={`Первоначальный взнос (${percent(form.advancePercent)}%)`}
                                value={money(quote.advanceAmount)}
                              />
                              <Detail
                                label="Сумма финансирования"
                                value={money(quote.principal)}
                                strong
                              />
                              <Detail label="Срок лизинга" value={`${form.months} месяцев`} />
                              <Detail
                                label="Годовая ставка"
                                value={`${percent(quote.rate.annualRate)}%`}
                              />
                            </dl>
                            {isApplied && applied.previousQuote && (
                              <Card size="s" type="secondary">
                                <Flex direction="column" gap={4}>
                                  <Typography.Paragraph view="small" weight="medium">
                                    Было {money(applied.previousQuote.monthlyPayment)} при сроке{" "}
                                    {applied.previous.months} мес.
                                  </Typography.Paragraph>
                                  <Typography.Caption view="large" color="secondary">
                                    {form.months > applied.previous.months
                                      ? `${quote.monthlyPayment < applied.previousQuote.monthlyPayment ? "Платеж ниже" : quote.monthlyPayment > applied.previousQuote.monthlyPayment ? "Платеж выше" : "Платеж прежний"}, срок больше на ${form.months - applied.previous.months} мес.`
                                      : "Условия обновлены по вашему бюджету"}
                                  </Typography.Caption>
                                </Flex>
                              </Card>
                            )}
                            <Flex direction="column" gap={16}>
                              <div>
                                <Button
                                  view="link"
                                  size="m"
                                  iconLeft={<Document />}
                                  onClick={() => setScheduleOpen(true)}
                                >
                                  Показать график платежей
                                </Button>
                              </div>
                              <Button
                                view="accentSecondary"
                                size="l"
                                fullWidth
                                disabled={!currentProposalKey}
                                onClick={() => setProposalKey(currentProposalKey)}
                              >
                                Сформировать коммерческое предложение
                              </Button>
                              <Button
                                view="accentPrimary"
                                size="l"
                                fullWidth
                                iconRight={<ArrowDirectionRight />}
                                onClick={() => setContinueOpen(true)}
                              >
                                Продолжить оформление
                              </Button>
                              <Typography.Caption view="large" color="secondary">
                                Предварительный расчет. Без страхования и дополнительных расходов.
                                Не является офертой.
                              </Typography.Caption>
                            </Flex>
                          </>
                        ) : (
                          <Flex direction="column" gap={8}>
                            <Typography.Title
                              tag="div"
                              view="paragraph"
                              role="heading"
                              aria-level={3}
                            >
                              {form.price ? "Проверьте параметры" : "Начните со стоимости"}
                            </Typography.Title>
                            <Typography.Paragraph view="small" color="secondary">
                              {form.price
                                ? validation || "Загрузите доступные условия, чтобы увидеть расчет."
                                : "Укажите цену автомобиля от продавца, и здесь появится ваш платеж."}
                            </Typography.Paragraph>
                          </Flex>
                        )}
                        <Divider noGap />
                        <Flex gap={8} alignItems="center">
                          <Shield width={16} height={16} className={s.successIcon} />
                          <Typography.Caption view="large" color="secondary">
                            Расчет без заявки и персональных данных
                          </Typography.Caption>
                        </Flex>
                      </Flex>
                    </section>
                  </Card>
                  <Card size="m" type="secondary">
                    <Flex gap={16} alignItems="center" justifyContent="space-between" wrap>
                      <Flex direction="column" gap={4}>
                        <Typography.Paragraph view="medium" weight="semibold">
                          Есть комфортный платеж?
                        </Typography.Paragraph>
                        <Typography.Paragraph view="small" color="secondary">
                          Помощник подберет срок и аванс
                        </Typography.Paragraph>
                      </Flex>
                      <Button
                        view="accentSecondary"
                        size="m"
                        iconLeft={<Chat />}
                        onClick={openAssistant}
                      >
                        Подобрать
                      </Button>
                    </Flex>
                  </Card>
                </>
              )}
            </div>
          </div>

          {/* Как это работает */}
          {/* Ориентация StepperDesktop задается только пропом, а адаптивные пропы DS
              на SSR дают рассинхрон. Поэтому рендерим обе ориентации и показываем
              нужную CSS-медиазапросом. */}
          <section aria-label="Как это работает" className={s.section}>
            <StepperDesktop className={s.stepsHorizontal} steps={steps} currentStep={currentStep} />
            <StepperDesktop
              className={s.stepsVertical}
              orientation="vertical"
              steps={steps}
              currentStep={currentStep}
            />
          </section>

          {/* Полезно знать: слева заголовок и иллюстрация, справа вопросы. Каждый вопрос —
              отдельный Accordion DS из одного пункта: DS рисует его белой скругленной
              карточкой, так вопросы стоят отдельными плашками, как на bccleasing.kz. */}
          <section aria-labelledby="faq-heading" className={`${s.faq} ${s.section}`}>
            <div className={s.faqAside}>
              <Typography.Title tag="h2" id="faq-heading">
                Полезно знать
              </Typography.Title>
              <Image src={faqIllustration} alt="" className={s.faqImage} />
            </div>
            <Flex direction="column" gap={16}>
              {questions.map((question) => (
                <Accordion key={question.id} items={[question]} disableImages />
              ))}
            </Flex>
          </section>

          <footer className={s.section}>
            <Divider noGap />
            <div className={s.footer}>
              <Typography.Caption view="large" color="secondary">
                © {new Date().getFullYear()} BCC Leasing
              </Typography.Caption>
              <Typography.Caption className={s.footerEnd} view="large" color="secondary">
                Демонстрационная версия. Обычный автолизинг
              </Typography.Caption>
            </div>
          </footer>
        </Container>
      </main>

      {proposalKey && proposalKey === currentProposalKey && quote && (
        <ProposalDialog
          key={proposalKey}
          quote={quote}
          model={title}
          clientType={form.clientType}
          onClose={() => setProposalKey(null)}
        />
      )}
      {scheduleOpen && quote && (
        <ScheduleDialog quote={quote} model={title} onClose={() => setScheduleOpen(false)} />
      )}
      {continueOpen && quote && (
        <ScoringDialog
          quote={quote}
          model={title}
          clientType={form.clientType}
          onClose={() => setContinueOpen(false)}
        />
      )}
    </>
  );
}

function Detail({
  label,
  value,
  strong = false,
}: {
  label: string;
  value: string;
  strong?: boolean;
}) {
  return (
    <div className={s.detail}>
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

function ChoiceChips<T extends string | number>({
  labelledBy,
  options,
  value,
  loading = false,
  onChange,
}: {
  labelledBy: string;
  options: { value: T; label: string; disabled?: boolean }[];
  value: T;
  loading?: boolean;
  onChange: (value: T) => void;
}) {
  // Отступы между чипами дает сам Chip (margin-right 8, margin-bottom 4), gap не нужен.
  return (
    <Flex wrap role="group" aria-labelledby={labelledBy}>
      {options.map((option) => (
        <Skeleton
          key={option.value}
          visible={loading}
          br="var(--b-border-radius-cof-10)"
          className={s.chipSkeleton}
        >
          <Chip
            clickable
            variant={option.value === value ? "active" : "inactive"}
            aria-pressed={option.value === value}
            disabled={option.disabled}
            onClick={() => onChange(option.value)}
          >
            {option.label}
          </Chip>
        </Skeleton>
      ))}
    </Flex>
  );
}

// Заглушка карточки расчета на время первой загрузки: те же блоки, что у готового
// расчета, чтобы при появлении данных карточка не прыгала по высоте.
function SummarySkeleton() {
  const rows = [
    "Стоимость автомобиля",
    "Первоначальный взнос (20%)",
    "Сумма финансирования",
    "Срок лизинга",
    "Годовая ставка",
  ];
  return (
    <>
      <Flex direction="column" gap={8} role="status" aria-label="Загружаем условия">
        <Typography.Title tag="div" view="page" showSkeleton>
          000 000 ₸
        </Typography.Title>
        <Typography.Paragraph view="medium" color="secondary" showSkeleton>
          ежемесячный платеж
        </Typography.Paragraph>
      </Flex>
      <Divider noGap />
      <dl className={s.details} aria-hidden>
        {rows.map((label) => (
          <div className={s.detail} key={label}>
            <dt>
              <Skeleton visible br="var(--b-border-radius-cof-4)">
                <Typography.Paragraph view="small">{label}</Typography.Paragraph>
              </Skeleton>
            </dt>
            <dd>
              <Skeleton visible br="var(--b-border-radius-cof-4)">
                <Typography.Paragraph view="small">00 000 000 ₸</Typography.Paragraph>
              </Skeleton>
            </dd>
          </div>
        ))}
      </dl>
      <Skeleton visible br="var(--b-border-radius-cof-6)">
        <Button view="accentPrimary" size="l" fullWidth disabled>
          Продолжить оформление
        </Button>
      </Skeleton>
    </>
  );
}

// Заглушка поля формы DS (size="lg") по его контуру: контрол 56px со скруглением
// 12px, подсказка в 8px под ним — полосой по ширине текста; все вместе, как у DS,
// в прозрачной рамке 1px.
function FieldSkeleton({ hint }: { hint?: string }) {
  return (
    <Flex direction="column" gap={8} className={s.fieldSkeletonFrame} aria-hidden>
      <Skeleton visible br="var(--b-border-radius-cof-6)">
        <div className={s.fieldSkeleton} />
      </Skeleton>
      {hint && (
        <Flex>
          <Skeleton visible br="var(--b-border-radius-cof-2)" className={s.inlineSkeleton}>
            <Typography.Caption tag="div" view="large">
              {hint}
            </Typography.Caption>
          </Skeleton>
        </Flex>
      )}
    </Flex>
  );
}

// Заглушка ползунка стоимости: тонкая дорожка и подписи границ диапазона.
function SliderSkeleton() {
  return (
    <Flex direction="column" gap={12} aria-hidden>
      <div className={s.sliderSkeletonTrack}>
        <Skeleton visible br="var(--b-border-radius-circle)">
          <div className={s.sliderSkeleton} />
        </Skeleton>
      </div>
      <Flex justifyContent="space-between">
        <Skeleton visible br="var(--b-border-radius-cof-2)" className={s.inlineSkeleton}>
          <Typography.Caption tag="div" view="large">
            6 250 000 ₸
          </Typography.Caption>
        </Skeleton>
        <Skeleton visible br="var(--b-border-radius-cof-2)" className={s.inlineSkeleton}>
          <Typography.Caption tag="div" view="large">
            62 500 000 ₸
          </Typography.Caption>
        </Skeleton>
      </Flex>
    </Flex>
  );
}

type FullscreenDocument = Document & {
  webkitFullscreenEnabled?: boolean;
  webkitFullscreenElement?: Element | null;
  webkitExitFullscreen?: () => Promise<void>;
};
type FullscreenElement = HTMLElement & { webkitRequestFullscreen?: () => Promise<void> };

// Полноэкранный режим всего приложения через Fullscreen API. Safari до 16.4 знает
// только webkit-версии методов. Поддержка определяется после монтирования: на
// сервере document нет, а кнопка не должна давать рассинхрон гидратации.
function useFullscreen() {
  const [supported, setSupported] = useState(false);
  const [active, setActive] = useState(false);
  useEffect(() => {
    const doc = document as FullscreenDocument;
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setSupported(Boolean(doc.fullscreenEnabled || doc.webkitFullscreenEnabled));
    const sync = () => setActive(Boolean(doc.fullscreenElement || doc.webkitFullscreenElement));
    sync();
    document.addEventListener("fullscreenchange", sync);
    document.addEventListener("webkitfullscreenchange", sync);
    return () => {
      document.removeEventListener("fullscreenchange", sync);
      document.removeEventListener("webkitfullscreenchange", sync);
    };
  }, []);
  function toggle() {
    const doc = document as FullscreenDocument;
    const root = document.documentElement as FullscreenElement;
    const request = active
      ? (doc.exitFullscreen ?? doc.webkitExitFullscreen)?.call(doc)
      : (root.requestFullscreen ?? root.webkitRequestFullscreen)?.call(root);
    // Отказ браузера (например, запрет в iframe) не ломает страницу.
    request?.catch(() => {});
  }
  return { supported, active, toggle };
}
