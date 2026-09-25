"use client";

import { useEffect, useMemo, useState } from "react";
import { Button, Chip, Flex, Input, Typography } from "bcc-design";
import CheckOutlinedBold from "bcc-design-icons/base/Basic/CheckOutlinedBold";
import Search from "bcc-design-icons/base/Basic/Search";
import Car from "bcc-design-icons/base/TransportationLogistics/Car";
import { appPath } from "@/lib/app-path";
import { money } from "@/lib/format";
import type { LeaseModel } from "@/lib/types";
import { modelLabel } from "@/lib/vehicle";
import s from "./vehicle-catalog.module.scss";

const PAGE = 12;
// Меняется вместе с логикой подбора фото: старые ответы из кэша браузера не используются.
const PHOTO_VERSION = 2;
const ACRONYMS = new Set(["BMW", "BYD", "GAC", "JAC", "FAW", "UAZ", "ГАЗ", "MINI"]);

/** «MERCEDES-BENZ» → «Mercedes-Benz», аббревиатуры как есть. */
function brandLabel(brand: string) {
  if (ACRONYMS.has(brand)) return brand;
  return brand.toLocaleLowerCase().replace(/(^|[\s-])(\p{L})/gu, (m) => m.toLocaleUpperCase());
}
const TOP_BRANDS = 10;

/**
 * Каталог автомобилей банка карточками с фото. Выбор карточки подставляет модель
 * в калькулятор — то же действие, что выбор в поле «Автомобиль».
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
  const [limit, setLimit] = useState(PAGE);

  const brands = useMemo(() => {
    const counts = new Map<string, number>();
    for (const model of models) counts.set(model.brand, (counts.get(model.brand) ?? 0) + 1);
    return [...counts.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, TOP_BRANDS)
      .map(([name]) => name);
  }, [models]);

  const found = useMemo(() => {
    const words = query.toLocaleLowerCase().trim().split(/\s+/).filter(Boolean);
    return models.filter(
      (model) =>
        (!brand || model.brand === brand) &&
        words.every((word) =>
          `${model.brand} ${model.name} ${model.partnerName}`.toLocaleLowerCase().includes(word),
        ),
    );
  }, [models, brand, query]);

  function filter(next: { query?: string; brand?: string }) {
    if (next.query !== undefined) setQuery(next.query);
    if (next.brand !== undefined) setBrand(next.brand);
    setLimit(PAGE);
  }

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

      <Flex direction="column" gap={12}>
        <Input
          fullWidth
          label="Марка или модель"
          value={query}
          leftAddon={<Search />}
          autoComplete="off"
          onChange={(event) => filter({ query: event.target.value })}
        />
        <Flex gap={8} wrap role="group" aria-label="Марка">
          {["", ...brands].map((name) => (
            <Chip
              key={name || "all"}
              clickable
              size="s"
              variant={brand === name ? "active" : "inactive"}
              aria-pressed={brand === name}
              onClick={() => filter({ brand: brand === name ? "" : name })}
            >
              {name ? brandLabel(name) : "Все марки"}
            </Chip>
          ))}
        </Flex>
      </Flex>

      {found.length === 0 ? (
        <Typography.Paragraph view="medium" color="secondary">
          Ничего не нашли. Попробуйте другую марку или модель.
        </Typography.Paragraph>
      ) : (
        <ul className={s.grid}>
          {found.slice(0, limit).map((model) => (
            <li key={model.id}>
              <CatalogCard
                model={model}
                selected={model.id === selected}
                onSelect={() => onSelect(model)}
              />
            </li>
          ))}
        </ul>
      )}

      <Flex direction="column" alignItems="center" gap={8}>
        {found.length > limit && (
          <Button view="neutralFilledSecondary" size="l" onClick={() => setLimit(limit + PAGE)}>
            Показать еще ({found.length - limit})
          </Button>
        )}
        <Typography.Caption view="large" color="secondary">
          Фото и цены — ориентир по объявлениям kolesa.kz: комплектация, цвет и цена у продавца
          могут отличаться.
        </Typography.Caption>
      </Flex>
    </section>
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
  const label = modelLabel(model);
  // Та же рыночная цена, что подставится в калькулятор при выборе.
  useEffect(() => {
    const controller = new AbortController();
    fetch(appPath(`/api/catalog/market?id=${model.id}`), { signal: controller.signal })
      .then((response) => (response.ok ? response.json() : null))
      .then((data: { price: number | null; brandPhoto?: boolean } | null) => {
        setPrice(data?.price ?? null);
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
      </Flex>
      <Button
        view={selected ? "accentSecondary" : "accentPrimary"}
        size="m"
        fullWidth
        iconLeft={selected ? <CheckOutlinedBold /> : undefined}
        aria-pressed={selected}
        onClick={onSelect}
      >
        {selected ? "Выбран в расчете" : "Рассчитать лизинг"}
      </Button>
    </article>
  );
}
