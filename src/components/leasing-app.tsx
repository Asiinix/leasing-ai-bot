"use client";

import { appPath } from "@/lib/app-path";

import dynamic from "next/dynamic";
import Image from "next/image";
import { type ComponentRef, useEffect, useMemo, useRef, useState } from "react";
import {
  Accordion,
  Alert,
  Breadcrumbs,
  Button,
  Carousel,
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
import ArrowDirectionLeft from "bcc-design-icons/base/Arrows/ArrowDirectionLeft";
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
import { initialDraft, type LeaseDraft } from "@/lib/draft";
import { useLeaseDraft } from "@/lib/use-lease-draft";
import { ApplicationDialog } from "./application-dialog";
import { AssistantPanel } from "./assistant-panel";
import { type ApplicationContact } from "./application-contact-form";
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
type FormState = Pick<LeaseDraft, "clientType" | "modelId" | "price" | "advancePercent" | "months">;
const pickForm = ({
  clientType,
  modelId,
  price,
  advancePercent,
  months,
}: FormState): FormState => ({
  clientType,
  modelId,
  price,
  advancePercent,
  months,
});
type Applied = {
  previous: FormState;
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

/**
 * Load reference data with automatic retries (after 1 s and 2 s): a short network drop or a
 * server restart must not leave the calculator empty. Client errors (4xx) are not retried.
 */
async function fetchJson<T>(url: string, signal: AbortSignal, attempts = 3): Promise<T> {
  for (let attempt = 0; ; attempt++) {
    try {
      const response = await fetch(url, { signal });
      if (response.ok) return (await response.json()) as T;
      if (response.status < 500 && response.status !== 429)
        throw Object.assign(new Error(`HTTP ${response.status}`), { final: true });
      if (attempt + 1 >= attempts) throw new Error(`HTTP ${response.status}`);
    } catch (error) {
      const failure = error as Error & { final?: boolean };
      if (failure.name === "AbortError" || failure.final || attempt + 1 >= attempts) throw error;
    }
    await new Promise<void>((resolve, reject) => {
      const timer = setTimeout(resolve, 1000 * 2 ** attempt);
      signal.addEventListener(
        "abort",
        () => {
          clearTimeout(timer);
          reject(new DOMException("Aborted", "AbortError"));
        },
        { once: true },
      );
    });
  }
}

function closestRate(rates: LeaseRate[], form: FormState) {
  return [...rates].sort(
    (a, b) =>
      Math.abs(a.advancePercent - form.advancePercent) -
        Math.abs(b.advancePercent - form.advancePercent) ||
      Math.abs(a.months - form.months) - Math.abs(b.months - form.months),
  )[0];
}

export function LeasingApp() {
  // Единое состояние заявки: калькулятор, помощник и форма заявки читают и пишут его.
  const draft = useLeaseDraft();
  const form = draft.state.values;
  const [catalog, setCatalog] = useState<CatalogData | null>(null);
  const [catalogError, setCatalogError] = useState(false);
  const [loadedTerms, setLoadedTerms] = useState<{ key: string; data: TermsData } | null>(null);
  const [termsError, setTermsError] = useState("");
  const [retry, setRetry] = useState(0);
  const [assistantOpen, setAssistantOpen] = useState(false);
  const [proposalKey, setProposalKey] = useState<string | null>(null);
  const [scheduleOpen, setScheduleOpen] = useState(false);
  // Скоринг — отдельное окно после отправки заявки: номер заявки, ссылка на сервис BCC
  // и ИИН из контактов (для ТОО нужен БИН, его клиент вводит сам).
  const [scoring, setScoring] = useState<{
    applicationId: string;
    continueUrl: string;
    taxId: string;
  } | null>(null);
  const [continueOpen, setContinueOpen] = useState(false);
  // Стоимость из примера — не данные клиента.
  const sample = draft.state.sources.price === "default";
  // Контакты заявки живут только в памяти страницы: в localStorage не пишутся.
  const [contact, setContact] = useState<ApplicationContact>({
    fullName: "",
    email: "",
    phone: "",
    iin: "",
    consent: false,
  });
  const [applied, setApplied] = useState<Applied | null>(null);
  const assistantAnchor = useRef<HTMLDivElement>(null);
  const colorMode = useColorMode();
  const headerRef = useRef<HTMLDivElement>(null);
  const heroRef = useRef<HTMLDivElement>(null);
  const carouselRef = useRef<ComponentRef<typeof Carousel>>(null);
  const [heroSlide, setHeroSlide] = useState(0);
  // Баннеры листаются сами каждые 3 секунды; пауза, пока курсор или фокус внутри,
  // чтобы клиент успел прочитать и нажать кнопку.
  const [heroPaused, setHeroPaused] = useState(false);
  // Свой таймер вместо autoPlay из DS: тот листает только миниатюры и не обновляет
  // currentIndex, от которого зависят кнопки навигации и inert у слайдов. Таймер
  // перезапускается при каждой смене слайда, в том числе ручной.
  useEffect(() => {
    if (heroPaused) return;
    const timer = setTimeout(() => carouselRef.current?.goToNext(true), 3000);
    return () => clearTimeout(timer);
  }, [heroSlide, heroPaused]);
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
    fetchJson<CatalogData>(appPath("/api/catalog"), controller.signal)
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
    fetchJson<TermsData>(
      appPath(`/api/terms?modelId=${form.modelId}&clientType=${form.clientType}`),
      controller.signal,
    )
      .then((data) => {
        if (controller.signal.aborted) return;
        setLoadedTerms({ key: termsKey, data });
        setTermsError("");
        const current = draft.latest.current;
        const values = current.values;
        if (
          values.modelId !== form.modelId ||
          values.clientType !== form.clientType ||
          data.rates.some(
            (rate) =>
              rate.months === values.months && rate.advancePercent === values.advancePercent,
          ) ||
          // Значения, названные клиентом в чате, не подменяем догадкой: калькулятор
          // покажет, что сочетание недоступно, а помощник предложит варианты.
          current.sources.months === "chat" ||
          current.sources.advancePercent === "chat"
        )
          return;
        const selected = closestRate(data.rates, values);
        // Подобранное ближайшее сочетание — предложение, а не подтвержденные данные.
        if (selected)
          draft.update(
            { months: selected.months, advancePercent: selected.advancePercent },
            "default",
          );
      })
      .catch((error) => {
        if (error.name !== "AbortError") setTermsError(termsKey);
      });
    return () => controller.abort();
    // eslint-disable-next-line react-hooks/exhaustive-deps
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
  const isApplied = applied && applied.nextKey === formKey(pickForm(form));
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
    draft.update(patch, "form");
  }
  /** Единый вход в заявку из калькулятора и чата: заявка, после отправки — скоринг. */
  function openApplication() {
    setContinueOpen(true);
  }
  /** «Изменить данные»: к полям калькулятора (на мобиле — прокрутка к форме). */
  function editData() {
    const form = document.getElementById("calculator-form");
    form?.scrollIntoView({ behavior: "smooth", block: "start" });
    requestAnimationFrame(() =>
      form?.querySelector<HTMLInputElement>("input")?.focus({ preventScroll: true }),
    );
  }
  function openAssistant() {
    setAssistantOpen(true);
    requestAnimationFrame(() => {
      if (window.innerWidth < 992)
        assistantAnchor.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    });
  }
  function applyOffer(offer: Quote, maxMonthly: number, clientType: ClientType) {
    const next: FormState = {
      ...pickForm(form),
      price: offer.price,
      clientType,
      advancePercent: offer.rate.advancePercent,
      months: offer.rate.months,
    };
    setApplied({
      previous: pickForm(form),
      previousQuote: quote,
      nextKey: formKey(next),
      maxMonthly,
    });
    // Клиент сам выбрал вариант — значения подтверждены.
    draft.update(next, "form");
    setAssistantOpen(false);
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
    draft.update(pickForm(initialDraft().values), "default");
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
        <Container maxWidth={1280} className={s.container}>
          {/* HeaderDesktop не подошел: он всегда резервирует справа пустой блок
              пользователя и на мобиле обрезает левую часть. */}
          <Flex as="header" alignItems="center" className={s.headerBar}>
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
      <section
        ref={heroRef}
        className={s.heroCarousel}
        aria-label="Предложения"
        aria-roledescription="карусель"
        onMouseEnter={() => setHeroPaused(true)}
        onMouseLeave={() => setHeroPaused(false)}
        onFocus={() => setHeroPaused(true)}
        onBlur={(event) => {
          if (!event.currentTarget.contains(event.relatedTarget)) setHeroPaused(false);
        }}
      >
        <Carousel
          ref={carouselRef}
          visibleSlides={1}
          slideGap={0}
          autoPlay={false}
          showFade={false}
          onStateUpdate={(state) => setHeroSlide(state.currentIndex)}
        >
          <div
            className={`${s.hero} bcc-root_theme_bcc-leasing-light`}
            inert={heroSlide !== 0}
            aria-hidden={heroSlide !== 0}
          >
            <Container maxWidth={1280} className={`${s.container} ${s.heroInner}`}>
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

          <div
            className={`${s.hero} ${s.ironHero} bcc-root_theme_bcc-leasing-light`}
            inert={heroSlide !== 1}
            aria-hidden={heroSlide !== 1}
          >
            <Container maxWidth={1280} className={`${s.container} ${s.heroInner}`}>
              <Flex direction="column" gap={24} className={s.heroContent}>
                <Typography.Caption>Банк ЦентрКредит · Премиальная карта</Typography.Caption>
                <Flex direction="column" gap={8}>
                  <Typography.Title tag="h2">Премиальная #IronCard</Typography.Title>
                  <Typography.Paragraph view="large" color="secondary">
                    Карта для ценителей комфорта и эксклюзивности
                  </Typography.Paragraph>
                </Flex>
                <div>
                  <Button
                    view="accentPrimary"
                    size="l"
                    // BCC DS 4.4.11 drops href in BaseButton; open the product page explicitly.
                    onClick={() =>
                      window.open(
                        "https://www.bcc.kz/personal/cards/ironcard/",
                        "_blank",
                        "noopener,noreferrer",
                      )
                    }
                  >
                    Оформить кредит на IronCard
                  </Button>
                </div>
              </Flex>
            </Container>
          </div>

          <div
            className={`${s.hero} ${s.lifeHero} bcc-root_theme_bcc-leasing-light`}
            inert={heroSlide !== 2}
            aria-hidden={heroSlide !== 2}
          >
            <Container maxWidth={1280} className={`${s.container} ${s.heroInner}`}>
              <Flex direction="column" gap={24} className={s.heroContent}>
                <Typography.Caption>BCC Life · Страхование жизни</Typography.Caption>
                <Flex direction="column" gap={8}>
                  <Typography.Title tag="h2">Застрахуй братуху</Typography.Title>
                  <Typography.Paragraph view="large" color="secondary">
                    Даже если у него всё схвачено.
                  </Typography.Paragraph>
                </Flex>
                <div>
                  <Button
                    view="accentPrimary"
                    size="l"
                    // BCC DS 4.4.11 drops href in BaseButton; open the product page explicitly.
                    onClick={() =>
                      window.open("https://bcclife.kz/ru", "_blank", "noopener,noreferrer")
                    }
                  >
                    Получить консультацию
                  </Button>
                </div>
              </Flex>
            </Container>
          </div>

          <div
            className={`${s.hero} ${s.investHero} bcc-root_theme_bcc-leasing-light`}
            inert={heroSlide !== 3}
            aria-hidden={heroSlide !== 3}
          >
            <svg
              className={s.investChart}
              viewBox="0 0 400 220"
              preserveAspectRatio="xMaxYMax meet"
              aria-hidden
            >
              <g opacity="0.9">
                <line x1="20" x2="20" y1="205" y2="178" stroke="#3ddc97" strokeWidth="2" />
                <rect x="11" y="185" width="18" height="15" rx="2" fill="#3ddc97" />
                <line x1="55" x2="55" y1="200" y2="180" stroke="#ff6b6b" strokeWidth="2" />
                <rect x="46" y="186" width="18" height="9" rx="2" fill="#ff6b6b" />
                <line x1="90" x2="90" y1="198" y2="162" stroke="#3ddc97" strokeWidth="2" />
                <rect x="81" y="170" width="18" height="24" rx="2" fill="#3ddc97" />
                <line x1="125" x2="125" y1="178" y2="144" stroke="#3ddc97" strokeWidth="2" />
                <rect x="116" y="150" width="18" height="22" rx="2" fill="#3ddc97" />
                <line x1="160" x2="160" y1="166" y2="140" stroke="#ff6b6b" strokeWidth="2" />
                <rect x="151" y="150" width="18" height="8" rx="2" fill="#ff6b6b" />
                <line x1="195" x2="195" y1="160" y2="120" stroke="#3ddc97" strokeWidth="2" />
                <rect x="186" y="128" width="18" height="29" rx="2" fill="#3ddc97" />
                <line x1="230" x2="230" y1="138" y2="104" stroke="#3ddc97" strokeWidth="2" />
                <rect x="221" y="112" width="18" height="18" rx="2" fill="#3ddc97" />
                <line x1="265" x2="265" y1="128" y2="100" stroke="#ff6b6b" strokeWidth="2" />
                <rect x="256" y="114" width="18" height="6" rx="2" fill="#ff6b6b" />
                <line x1="300" x2="300" y1="124" y2="80" stroke="#3ddc97" strokeWidth="2" />
                <rect x="291" y="88" width="18" height="31" rx="2" fill="#3ddc97" />
                <line x1="335" x2="335" y1="96" y2="54" stroke="#3ddc97" strokeWidth="2" />
                <rect x="326" y="62" width="18" height="28" rx="2" fill="#3ddc97" />
                <line x1="370" x2="370" y1="70" y2="24" stroke="#3ddc97" strokeWidth="2" />
                <rect x="361" y="34" width="18" height="30" rx="2" fill="#3ddc97" />
              </g>
              <path
                d="M10 205 C 120 190, 200 150, 390 20"
                fill="none"
                stroke="#ffffff"
                strokeOpacity="0.5"
                strokeWidth="3"
                strokeDasharray="8 8"
              />
            </svg>
            <Container maxWidth={1280} className={`${s.container} ${s.heroInner}`}>
              <Flex direction="column" gap={24} className={s.heroContent}>
                <Typography.Caption>BCC Invest · Брокерский счет</Typography.Caption>
                <Flex direction="column" gap={8}>
                  <Typography.Title tag="h2">Деньги под матрасом не качаются</Typography.Title>
                  <Typography.Paragraph view="large" color="secondary">
                    В отличие от братухи. Пусть капитал тоже поработает.
                  </Typography.Paragraph>
                </Flex>
                <div>
                  <Button
                    view="accentPrimary"
                    size="l"
                    // BCC DS 4.4.11 drops href in BaseButton; open the product page explicitly.
                    onClick={() =>
                      window.open("https://bccinvest.kz", "_blank", "noopener,noreferrer")
                    }
                  >
                    Открыть счет
                  </Button>
                </div>
                <Typography.Caption color="secondary">
                  Инвестиции связаны с риском, доходность в прошлом не гарантирует доходность в
                  будущем.
                </Typography.Caption>
              </Flex>
            </Container>
          </div>
        </Carousel>
        <Container maxWidth={1280} className={`${s.container} ${s.heroNavigation}`}>
          <Flex gap={8} alignItems="center" wrap>
            <Button
              view="neutralFilledSecondary"
              size="m"
              iconLeft={<ArrowDirectionLeft />}
              aria-label="Предыдущий баннер"
              onClick={() => carouselRef.current?.goToPrevious(true)}
            />
            {["Лизинг", "IronCard", "BCC Life", "BCC Invest"].map((label, index) => (
              <Button
                key={label}
                view={heroSlide === index ? "accentPrimary" : "neutralFilledSecondary"}
                size="m"
                aria-current={heroSlide === index ? "true" : undefined}
                onClick={() => carouselRef.current?.goToSlide(index)}
              >
                {label}
              </Button>
            ))}
            <Button
              view="neutralFilledSecondary"
              size="m"
              iconLeft={<ArrowDirectionRight />}
              aria-label="Следующий баннер"
              onClick={() => carouselRef.current?.goToNext(true)}
            />
          </Flex>
        </Container>
      </section>
      <main id="calculator" aria-busy={booting}>
        <Container maxWidth={1280} className={`${s.container} ${s.page}`}>
          {isApplied && (
            <Alert
              variant="success"
              fullWidth
              hasCloser
              autoCloseDelay={null}
              title={`Условия применены: ${form.months} месяцев, аванс ${percent(form.advancePercent)}%`}
              actionButtonText="Отменить"
              actionButtonHandler={() => {
                draft.update(applied.previous, "form");
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
              <section aria-labelledby="parameters-heading" id="calculator-form">
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
                  draft={draft.state}
                  modelName={title}
                  onPatch={draft.applyAssistantPatch}
                  onSelectModel={(modelId) => {
                    // Цена относится к выбранному автомобилю клиента и при смене записи
                    // справочника сохраняется; сочетание срока и аванса проверит расчет.
                    change({ modelId });
                    setApplied(null);
                  }}
                  onApplyOffer={applyOffer}
                  onOpenApplication={openApplication}
                  onEditData={editData}
                  onClose={() => setAssistantOpen(false)}
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
                                className={s.multilineButton}
                                disabled={!currentProposalKey}
                                onClick={() => setProposalKey(currentProposalKey)}
                              >
                                Сформировать коммерческое предложение
                              </Button>
                              <Button
                                view="accentPrimary"
                                size="l"
                                fullWidth
                                className={s.multilineButton}
                                iconRight={<ArrowDirectionRight />}
                                onClick={openApplication}
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
                            {/* Без расчета главный следующий шаг — помощник: он заполнит
                                стоимость, аванс и срок по сообщению клиента. */}
                            <Flex direction="column" gap={8} className={s.emptyAction}>
                              <Button
                                view="accentPrimary"
                                size="l"
                                fullWidth
                                iconLeft={<Chat />}
                                onClick={openAssistant}
                              >
                                Спросить ИИ-помощника
                              </Button>
                              <Typography.Caption view="large" color="secondary">
                                Например: «Автомобиль за 20 млн тенге, аванс 20%, на 4 года»
                              </Typography.Caption>
                            </Flex>
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
      {continueOpen && (
        <ApplicationDialog
          draft={draft.state}
          modelName={title}
          quote={quote}
          quoteProblem={validation}
          onUpdate={(patch) => draft.update(patch, "form")}
          onEditParams={() => {
            setContinueOpen(false);
            editData();
          }}
          contact={contact}
          onContactChange={setContact}
          onSubmitted={(result, submitted) => {
            setContinueOpen(false);
            setScoring({
              applicationId: result.id,
              continueUrl: result.continueUrl,
              taxId: form.clientType === "IP" ? submitted.iin : "",
            });
          }}
          onClose={() => setContinueOpen(false)}
        />
      )}
      {scoring && quote && (
        <ScoringDialog
          quote={quote}
          model={title}
          clientType={form.clientType}
          applicationId={scoring.applicationId}
          continueUrl={scoring.continueUrl}
          initialTaxId={scoring.taxId}
          onClose={() => setScoring(null)}
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
