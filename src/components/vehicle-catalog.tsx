"use client";

import { useEffect, useMemo, useState } from "react";
import { Button, Chip, Flex, Input, Typography } from "bcc-design";
import CheckOutlinedBold from "bcc-design-icons/base/Basic/CheckOutlinedBold";
import Search from "bcc-design-icons/base/Basic/Search";
import Car from "bcc-design-icons/base/TransportationLogistics/Car";
import { appPath } from "@/lib/app-path";
import { money } from "@/lib/format";
import { pricePreset } from "@/lib/price-presets";
import type { LeaseModel } from "@/lib/types";
import { brandLabel, modelLabel } from "@/lib/vehicle";
import { Dialog } from "./dialog";
import s from "./vehicle-catalog.module.scss";

/** Карточек на странице; остальные — в модальном окне. */
const PREVIEW = 8;
/** Порция карточек в модальном окне. */
const PAGE = 24;
const DISCLAIMER =
  "Фото и цены — ориентир по объявлениям kolesa.kz или типичной цене модели: комплектация, цвет и цена у продавца могут отличаться.";
// Меняется вместе с логикой подбора фото: старые ответы из кэша браузера не используются.
const PHOTO_VERSION = 2;
const TOP_BRANDS = 10;

/** Самые ходовые модели в Казахстане — первыми на странице. */
const BESTSELLERS = [
  "TOYOTA|CAMRY",
  "HYUNDAI|TUCSON",
  "KIA|SPORTAGE",
  "CHEVROLET|COBALT",
  "HYUNDAI|ELANTRA",
  "LADA|GRANTA",
  "CHANGAN|CS35",
  "GEELY|COOLRAY",
  "TOYOTA|RAV4",
  "KIA|K5",
  "HYUNDAI|ACCENT",
  "HAVAL|JOLION",
  "CHERY|TIGGO",
  "JAC|S3",
  "TOYOTA|LAND",
  "HYUNDAI|SANTA",
];

function popularity(model: LeaseModel) {
  const key = `${model.brand}|${model.name.split(/\s+/)[0]}`.toUpperCase();
  const rank = BESTSELLERS.indexOf(key);
  if (rank >= 0) return rank;
  return pricePreset(model).level === "model" ? BESTSELLERS.length : BESTSELLERS.length + 1;
}

/** Слова поиска по марке, модели и продавцу, как в поле «Автомобиль». */
function useFound(models: LeaseModel[], brand: string, query: string) {
  return useMemo(() => {
    const words = query.toLocaleLowerCase().trim().split(/\s+/).filter(Boolean);
    return (
      models
        .filter(
          (model) =>
            (!brand || model.brand === brand) &&
            words.every((word) =>
              `${model.brand} ${model.name} ${model.partnerName}`
                .toLocaleLowerCase()
                .includes(word),
            ),
        )
        // Сначала самые ходовые модели, затем остальные популярные (с заготовкой цены),
        // внутри — порядок каталога банка.
        .sort((a, b) => popularity(a) - popularity(b))
    );
  }, [models, brand, query]);
}

/**
 * Каталог автомобилей банка карточками с фото. На странице — первые карточки,
 * весь каталог открывается в модальном окне с теми же фильтрами. Выбор карточки
 * подставляет модель в калькулятор — то же действие, что выбор в поле «Автомобиль».
 */
export function VehicleCatalog({
  models,
  selected,
  onSelect,
}: {
  models: LeaseModel[];
  selected: number;
  onSelect: (model: LeaseModel) => void;
}) {
  const [query, setQuery] = useState("");
  const [brand, setBrand] = useState("");
  const [open, setOpen] = useState(false);
  const found = useFound(models, brand, query);
  // На странице — по одной карточке на модель: комплектации (Camry, Camry Gracia…)
  // и дубли у разных продавцов остаются в полном каталоге.
  const preview = useMemo(() => {
    const seen = new Set<string>();
    return found
      .filter((model) => {
        const key = `${model.brand}|${model.name.split(/\s+/)[0]}`.toUpperCase();
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
      })
      .slice(0, PREVIEW);
  }, [found]);

  const brands = useMemo(() => {
    const counts = new Map<string, number>();
    for (const model of models) counts.set(model.brand, (counts.get(model.brand) ?? 0) + 1);
    return [...counts.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, TOP_BRANDS)
      .map(([name]) => name);
  }, [models]);

  const filters = (
    <Filters query={query} brand={brand} brands={brands} onQuery={setQuery} onBrand={setBrand} />
  );

  return (
    <section aria-labelledby="catalog-heading" className={s.catalog} id="catalog">
      <Flex direction="column" gap={8}>
        <Typography.Title tag="h2" id="catalog-heading">
          Каталог автомобилей
        </Typography.Title>
        <Typography.Paragraph view="medium" color="secondary">
          {models.length} моделей, доступных в лизинг. Выберите автомобиль — модель и
          ориентировочная цена подставятся в калькулятор.
        </Typography.Paragraph>
      </Flex>

      {filters}
      <CatalogGrid models={preview} selected={selected} onSelect={onSelect} />

      {found.length > preview.length && (
        <Flex justifyContent="center">
          <Button
            view="neutralFilledSecondary"
            size="l"
            aria-haspopup="dialog"
            onClick={() => setOpen(true)}
          >
            Показать все ({found.length})
          </Button>
        </Flex>
      )}

      {open && (
        <Dialog
          wide
          title="Каталог автомобилей"
          description={`Найдено ${found.length} из ${models.length}`}
          onClose={() => setOpen(false)}
        >
          <CatalogModalBody
            found={found}
            filters={filters}
            selected={selected}
            onSelect={(model) => {
              setOpen(false);
              // Окно при закрытии возвращает фокус на кнопку «Показать еще» и прокручивает
              // к ней; переход к калькулятору — после закрытия.
              setTimeout(() => onSelect(model), 350);
            }}
          />
        </Dialog>
      )}
    </section>
  );
}

/** Весь каталог в окне: карточки порциями, чтобы не грузить сотни фото сразу. */
function CatalogModalBody({
  found,
  filters,
  selected,
  onSelect,
}: {
  found: LeaseModel[];
  filters: React.ReactNode;
  selected: number;
  onSelect: (model: LeaseModel) => void;
}) {
  const [limit, setLimit] = useState(PAGE);
  // Новый фильтр — снова с первой порции.
  const [shownFor, setShownFor] = useState(found);
  if (shownFor !== found) {
    setShownFor(found);
    setLimit(PAGE);
  }
  return (
    <Flex direction="column" gap={24}>
      {filters}
      <CatalogGrid models={found.slice(0, limit)} selected={selected} onSelect={onSelect} compact />
      {found.length > limit && (
        <Flex justifyContent="center">
          <Button view="neutralFilledSecondary" size="l" onClick={() => setLimit(limit + PAGE)}>
            Показать еще ({found.length - limit})
          </Button>
        </Flex>
      )}
      <Typography.Caption view="large" color="secondary">
        {DISCLAIMER}
      </Typography.Caption>
    </Flex>
  );
}

function Filters({
  query,
  brand,
  brands,
  onQuery,
  onBrand,
}: {
  query: string;
  brand: string;
  brands: string[];
  onQuery: (value: string) => void;
  onBrand: (value: string) => void;
}) {
  return (
    <Flex direction="column" gap={12}>
      <Input
        fullWidth
        label="Марка или модель"
        value={query}
        leftAddon={<Search />}
        autoComplete="off"
        onChange={(event) => onQuery(event.target.value)}
      />
      <Flex gap={8} wrap role="group" aria-label="Марка">
        {["", ...brands].map((name) => (
          <Chip
            key={name || "all"}
            clickable
            size="s"
            variant={brand === name ? "active" : "inactive"}
            aria-pressed={brand === name}
            onClick={() => onBrand(brand === name ? "" : name)}
          >
            {name ? brandLabel(name) : "Все марки"}
          </Chip>
        ))}
      </Flex>
    </Flex>
  );
}

function CatalogGrid({
  models,
  selected,
  onSelect,
  compact = false,
}: {
  models: LeaseModel[];
  selected: number;
  onSelect: (model: LeaseModel) => void;
  compact?: boolean;
}) {
  if (!models.length)
    return (
      <Typography.Paragraph view="medium" color="secondary">
        Ничего не нашли. Попробуйте другую марку или модель.
      </Typography.Paragraph>
    );
  return (
    <ul className={`${s.grid} ${compact ? s.compact : ""}`}>
      {models.map((model) => (
        <li key={model.id}>
          <CatalogCard
            model={model}
            selected={model.id === selected}
            onSelect={() => onSelect(model)}
          />
        </li>
      ))}
    </ul>
  );
}

function CatalogCard({
  model,
  selected,
  onSelect,
}: {
  model: LeaseModel;
  selected: boolean;
  onSelect: () => void;
}) {
  const [failed, setFailed] = useState(false);
  const [price, setPrice] = useState<number | null | undefined>(undefined);
  const [brandPhoto, setBrandPhoto] = useState(false);
  const [estimate, setEstimate] = useState(false);
  const label = modelLabel(model);
  // Та же рыночная цена, что подставится в калькулятор при выборе.
  useEffect(() => {
    const controller = new AbortController();
    fetch(appPath(`/api/catalog/market?id=${model.id}`), { signal: controller.signal })
      .then((response) => (response.ok ? response.json() : null))
      .then((data: { price: number | null; source?: string; brandPhoto?: boolean } | null) => {
        setPrice(data?.price ?? null);
        setEstimate(data?.source === "preset");
        setBrandPhoto(Boolean(data?.brandPhoto));
      })
      .catch(() => {
        if (!controller.signal.aborted) setPrice(null);
      });
    return () => controller.abort();
  }, [model.id]);
  return (
    <article className={`${s.card} ${selected ? s.selected : ""}`}>
      <div className={s.photo}>
        {failed ? (
          <span className={s.placeholder} aria-hidden>
            <Car />
          </span>
        ) : (
          // Внешнее фото через редирект нашего API: next/image тут не нужен.
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={appPath(`/api/catalog/photo?id=${model.id}&v=${PHOTO_VERSION}`)}
            alt={label}
            loading="lazy"
            decoding="async"
            onError={() => setFailed(true)}
          />
        )}
        {!failed && brandPhoto && <span className={s.badge}>Фото марки</span>}
      </div>
      <Flex direction="column" gap={4} className={s.body}>
        <Typography.Paragraph view="medium" weight="semibold">
          {label}
        </Typography.Paragraph>
        <Typography.Caption view="large" color="secondary">
          {model.partnerName}
        </Typography.Caption>
        <Typography.Paragraph view="small" weight="semibold" monospaceNumbers>
          {price === undefined
            ? "Цена загружается…"
            : price
              ? `≈ ${money(price)}`
              : "Цену уточните у продавца"}
        </Typography.Paragraph>
        {Boolean(price) && (
          <Typography.Caption view="large" color="secondary">
            {estimate ? "Ориентировочная цена" : "По объявлениям kolesa.kz"}
          </Typography.Caption>
        )}
      </Flex>
      <Button
        view={selected ? "accentSecondary" : "accentPrimary"}
        size="m"
        fullWidth
        iconLeft={selected ? <CheckOutlinedBold /> : undefined}
        aria-pressed={selected}
        onClick={onSelect}
      >
        {selected ? "Выбран" : "Рассчитать"}
      </Button>
    </article>
  );
}
