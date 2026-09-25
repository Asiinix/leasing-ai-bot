"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Button, Card, Flex, Input, Skeleton, Typography } from "bcc-design";
import type { LeaseModel } from "@/lib/types";
import type { VehiclePhoto } from "@/lib/kolesa";
import { appPath } from "@/lib/app-path";
import { money } from "@/lib/format";
import { modelLabel } from "@/lib/vehicle";
import { Dialog } from "./dialog";
import s from "./model-picker.module.scss";

export { modelLabel };

function VehicleCard({
  model,
  selected,
  onSelect,
  onAvailability,
}: {
  model: LeaseModel;
  selected: number;
  onSelect: (model: LeaseModel, price?: number) => void;
  onAvailability: (id: number, available: boolean) => void;
}) {
  const [photo, setPhoto] = useState<VehiclePhoto | null>(null);
  useEffect(() => {
    const controller = new AbortController();
    let preload: HTMLImageElement | undefined;
    let timer: ReturnType<typeof setTimeout> | undefined;
    fetch(appPath(`/api/catalog/vehicle?modelId=${model.id}&v=4`), { signal: controller.signal })
      .then(async (response) => {
        if (!response.ok) throw new Error("Listing unavailable");
        const result: VehiclePhoto = await response.json();
        if (!result.imageUrl) throw new Error("No photo");
        await new Promise<void>((resolve, reject) => {
          preload = new Image();
          preload.onload = () => {
            clearTimeout(timer);
            resolve();
          };
          preload.onerror = () => {
            clearTimeout(timer);
            reject(new Error("Broken photo"));
          };
          timer = setTimeout(() => reject(new Error("Photo timeout")), 10000);
          preload.src = result.imageUrl!;
        });
        if (!controller.signal.aborted) {
          setPhoto(result);
          onAvailability(model.id, true);
        }
      })
      .catch(() => {
        if (!controller.signal.aborted) onAvailability(model.id, false);
      });
    return () => {
      controller.abort();
      clearTimeout(timer);
      if (preload) {
        preload.onload = null;
        preload.onerror = null;
        preload.src = "";
      }
    };
  }, [model.id, onAvailability]);
  // A model becomes a card only after the actual image has loaded, not merely a URL.
  if (!photo) return null;
  return (
    <Card size="s" type="secondary" height="auto" className={s.card}>
      <Flex direction="column" gap={12}>
        <div className={s.photo}>
          {/* bcc-design has no standalone image; Card owns the presentation. */}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={photo.imageUrl!}
            alt={photo.listingTitle ?? modelLabel(model)}
            onError={() => {
              setPhoto(null);
              onAvailability(model.id, false);
            }}
          />
        </div>
        <Typography.Paragraph weight="semibold">{modelLabel(model)}</Typography.Paragraph>
        {photo.listingTitle && (
          <Typography.Caption color="secondary">{photo.listingTitle}</Typography.Caption>
        )}
        <Typography.Paragraph weight="semibold">
          {photo.price ? money(photo.price) : "Стоимость укажите вручную"}
        </Typography.Paragraph>
        <Typography.Caption color="secondary">{model.partnerName}</Typography.Caption>
        {photo.caption && (
          <Typography.Caption color="secondary">{photo.caption}</Typography.Caption>
        )}
        <Button
          fullWidth
          size="s"
          view={selected === model.id ? "accentPrimary" : "accentSecondary"}
          aria-pressed={selected === model.id}
          aria-label={`Выбрать ${modelLabel(model)}, ${model.partnerName}`}
          onClick={() => onSelect(model, photo.price)}
        >
          {selected === model.id ? "Выбрано" : "Выбрать"}
        </Button>
        {photo.sourceUrl && (
          <Button
            view="link"
            size="s"
            onClick={() => window.open(photo.sourceUrl!, "_blank", "noopener,noreferrer")}
          >
            Объявление на Kolesa.kz ↗
          </Button>
        )}
      </Flex>
    </Card>
  );
}

export function ModelPicker({
  models,
  selected,
  loading,
  onSelect,
}: {
  models: LeaseModel[];
  selected: number;
  loading: boolean;
  onSelect: (model: LeaseModel, price?: number) => void;
}) {
  const [open, setOpen] = useState(false);
  const [brand, setBrand] = useState("");
  const [query, setQuery] = useState("");
  const [page, setPage] = useState(0);
  const [availability, setAvailability] = useState<Record<number, boolean>>({});
  const [retry, setRetry] = useState(0);
  const onAvailability = useCallback((id: number, available: boolean) => {
    setAvailability((previous) => ({ ...previous, [id]: available }));
  }, []);
  const current = models.find((model) => model.id === selected);
  const brands = useMemo(
    () =>
      [...new Set(models.map((model) => model.brand.toUpperCase()))].sort((a, b) =>
        a.localeCompare(b, "ru"),
      ),
    [models],
  );
  const filtered = useMemo(() => {
    const words = query.toLowerCase().trim().split(/\s+/);
    return models.filter(
      (model) =>
        (!brand || model.brand.toUpperCase() === brand) &&
        words.every((word) =>
          `${model.brand} ${model.name} ${model.partnerName}`.toLowerCase().includes(word),
        ),
    );
  }, [models, brand, query]);
  const pageModels = filtered.slice(page * 6, (page + 1) * 6);
  const pending = pageModels.some((model) => availability[model.id] === undefined);
  const availableCount = pageModels.filter((model) => availability[model.id]).length;
  const chooseBrand = (value: string) => {
    setAvailability({});
    setBrand(value);
    setQuery("");
    setPage(0);
  };
  return (
    <>
      <Flex direction="column" gap={8}>
        <Typography.Caption color="secondary">Автомобиль</Typography.Caption>
        <Button
          fullWidth
          size="l"
          view="neutralFilledSecondary"
          loading={loading}
          disabled={loading}
          aria-label={`Автомобиль ${modelLabel(current)}`}
          aria-haspopup="dialog"
          aria-expanded={open}
          onClick={() => {
            chooseBrand("");
            setOpen(true);
          }}
        >
          {modelLabel(current)}
        </Button>
        <Typography.Caption color="secondary">
          {current?.partnerName ?? "Выберите марку и модель"}
        </Typography.Caption>
      </Flex>
      {open && (
        <Dialog
          wide
          title="Выберите автомобиль"
          onClose={() => setOpen(false)}
          description="Выберите марку, затем модель и продавца. Название появится в калькуляторе."
        >
          <Flex direction="column" gap={16}>
            <Flex alignItems="center" gap={16}>
              {brand && (
                <Button view="neutral" onClick={() => chooseBrand("")}>
                  ← Все марки
                </Button>
              )}
              <Typography.Paragraph weight="semibold">
                {brand || "Марки автомобилей"}
              </Typography.Paragraph>
            </Flex>
            <Input
              fullWidth
              label={brand ? "Поиск модели или продавца" : "Поиск марки или модели"}
              value={query}
              onChange={(event) => {
                setQuery(event.target.value);
                setPage(0);
              }}
            />
            {!brand && !query.trim() ? (
              <div className={s.brands}>
                {brands.map((item) => (
                  <Button
                    fullWidth
                    view="neutralFilledSecondary"
                    key={item}
                    onClick={() => chooseBrand(item)}
                  >
                    {item}
                  </Button>
                ))}
              </div>
            ) : (
              <>
                <Typography.Caption color="secondary">
                  Фото и стоимость — из объявления Kolesa.kz. При выборе цена заполнится
                  автоматически, если найдена для этой модели.
                </Typography.Caption>
                <Typography.Paragraph role="status">
                  {!filtered.length
                    ? "Ничего не нашли. Попробуйте название марки латиницей."
                    : pending
                      ? "Загружаем автомобили с фото…"
                      : availableCount
                        ? `Автомобилей с фото на странице: ${availableCount}`
                        : "На этой странице нет автомобилей с фото. Попробуйте другую страницу или марку."}
                </Typography.Paragraph>
                {pending && <Skeleton visible style={{ height: 8 }} />}
                {!pending && filtered.length > 0 && !availableCount && (
                  <Button
                    view="neutral"
                    onClick={() => {
                      setAvailability({});
                      setRetry(retry + 1);
                    }}
                  >
                    Повторить загрузку
                  </Button>
                )}
                <div className={s.cards}>
                  {pageModels.map((model) => (
                    <VehicleCard
                      key={`${model.id}:${retry}`}
                      onAvailability={onAvailability}
                      model={model}
                      selected={selected}
                      onSelect={(value, price) => {
                        onSelect(value, price);
                        setOpen(false);
                      }}
                    />
                  ))}
                </div>
                {filtered.length > 6 && (
                  <Flex
                    gap={16}
                    alignItems="center"
                    justifyContent="center"
                    role="navigation"
                    aria-label="Страницы автомобилей"
                  >
                    <Button
                      view="neutral"
                      disabled={page === 0}
                      onClick={() => {
                        setAvailability({});
                        setPage(page - 1);
                      }}
                    >
                      Назад
                    </Button>
                    <Typography.Caption>
                      {page + 1} / {Math.ceil(filtered.length / 6)}
                    </Typography.Caption>
                    <Button
                      view="neutral"
                      disabled={(page + 1) * 6 >= filtered.length}
                      onClick={() => {
                        setAvailability({});
                        setPage(page + 1);
                      }}
                    >
                      Далее
                    </Button>
                  </Flex>
                )}
              </>
            )}
          </Flex>
        </Dialog>
      )}
    </>
  );
}
