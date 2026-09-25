"use client";

import { useMemo, useState } from "react";
import { Card, Input, Select } from "bcc-design";
import { Search, ArrowRight } from "lucide-react";
import { Dialog } from "@/components/dialog";
import { Button } from "@/components/ui";
import { money, dateLabel } from "@/lib/format";
import { VehicleImage } from "./vehicle-image";
import type { VehicleCatalogItem } from "./types";
import { outsidePriceRange, type VehiclePriceRange } from "./eligibility";
import {
  VEHICLE_CATEGORIES,
  isVehicleCategory,
  type VehicleCategory,
} from "../insurance/categories";

export function VehicleCatalogDialog({
  vehicles,
  selectedId,
  priceRange = null,
  onSelect,
  onClose,
}: {
  vehicles: VehicleCatalogItem[];
  selectedId?: string;
  priceRange?: VehiclePriceRange | null;
  onSelect: (vehicle: VehicleCatalogItem) => void;
  onClose: () => void;
}) {
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState<VehicleCategory | "all">("all");
  const [limit, setLimit] = useState(18);
  const filtered = useMemo(() => {
    const words = query.trim().toLocaleLowerCase().split(/\s+/);
    return vehicles
      .filter((vehicle) => category === "all" || vehicle.category === category)
      .filter((vehicle) =>
        words.every((word) =>
          `${vehicle.brand} ${vehicle.model} ${vehicle.trim ?? ""} ${vehicle.partnerName}`
            .toLocaleLowerCase()
            .includes(word),
        ),
      )
      .sort(
        (a, b) =>
          Number(outsidePriceRange(a.priceKzt, priceRange)) -
            Number(outsidePriceRange(b.priceKzt, priceRange)) ||
          (a.priceKzt ?? Infinity) - (b.priceKzt ?? Infinity) ||
          a.brand.localeCompare(b.brand, "ru"),
      );
  }, [vehicles, query, priceRange, category]);
  return (
    <Dialog title="Каталог автомобилей" wide onClose={onClose}>
      <p className="dialog-intro">
        У каждого автомобиля есть фиксированная цена для демо. Цены из прайсов отмечены источником,
        остальные — ориентировочные оценки. Выберите автомобиль, чтобы подставить стоимость в
        расчёт.
      </p>
      <div className="vehicle-catalog-toolbar">
        <Input
          fullWidth
          autoFocus
          aria-label="Поиск в каталоге"
          placeholder="Марка, модель, комплектация или продавец"
          leftAddon={<Search size={20} />}
          value={query}
          onChange={(event) => {
            setQuery(event.target.value);
            setLimit(18);
          }}
        />
        <Select
          fullWidth
          allowSearch={false}
          aria-label="Категория каталога"
          value={category}
          options={[
            { value: "all", label: "Все категории" },
            ...Object.entries(VEHICLE_CATEGORIES).map(([value, item]) => ({
              value,
              label: `${item.label} · ${vehicles.filter((vehicle) => vehicle.category === value).length}`,
            })),
          ]}
          onChange={({ value }) => {
            if (value === "all" || isVehicleCategory(value)) {
              setCategory(value);
              setLimit(18);
            }
          }}
        />
        <p className="hint" role="status">
          Найдено: {filtered.length} · Все цены в тенге
        </p>
      </div>
      <div className="vehicle-catalog-grid">
        {filtered.slice(0, limit).map((vehicle) => (
          <article className="vehicle-catalog-card" key={vehicle.id}>
            <Card height="auto">
              <VehicleImage vehicle={vehicle} />
              <div className="vehicle-card-content">
                <div>
                  <h3>
                    {vehicle.brand} {vehicle.model}
                  </h3>
                  <p className="vehicle-card-meta">
                    {vehicle.trim ?? "Комплектация у продавца"}
                    {vehicle.modelYear ? ` · ${vehicle.modelYear}` : ""}
                  </p>
                </div>
                <p className="vehicle-card-seller">{vehicle.partnerName}</p>
                <p className="vehicle-category-label">
                  {VEHICLE_CATEGORIES[vehicle.category].label}
                </p>
                <strong className="vehicle-card-price">
                  {vehicle.priceKzt ? money(vehicle.priceKzt) : "Цена по запросу"}
                </strong>
                {vehicle.priceKind === "estimate" && (
                  <p className="vehicle-card-price-note" title={vehicle.priceBasis}>
                    Ориентировочная демо-цена
                  </p>
                )}
                {vehicle.priceKind === "reference" && vehicle.priceSourceUrl && (
                  <a
                    className="vehicle-price-source"
                    href={vehicle.priceSourceUrl}
                    target="_blank"
                    rel="noreferrer"
                  >
                    Цена зафиксирована {dateLabel(vehicle.priceCheckedAt!)} ↗
                  </a>
                )}
                {outsidePriceRange(vehicle.priceKzt, priceRange) && (
                  <p className="vehicle-card-eligibility">
                    {vehicle.priceKzt! < priceRange!.min
                      ? `Цена ниже порога лизинга — от ${money(priceRange!.min)}`
                      : `Цена выше порога лизинга — до ${money(priceRange!.max)}`}
                  </p>
                )}
                <Button
                  view={selectedId === vehicle.id ? "accentSecondary" : "accentPrimary"}
                  fullWidth
                  size="l"
                  onClick={() => onSelect(vehicle)}
                >
                  {selectedId === vehicle.id
                    ? "Выбрано — к расчёту"
                    : outsidePriceRange(vehicle.priceKzt, priceRange)
                      ? "Посмотреть автомобиль"
                      : vehicle.priceKzt
                        ? "Рассчитать лизинг"
                        : "Выбрать и указать цену"}
                  <ArrowRight size={18} />
                </Button>
              </div>
            </Card>
          </article>
        ))}
      </div>
      {!filtered.length && (
        <div className="empty-search">
          Автомобиль не найден. Измените запрос или откройте весь каталог.
        </div>
      )}
      {filtered.length > limit && (
        <Button
          className="vehicle-show-more"
          fullWidth
          size="l"
          onClick={() => setLimit((value) => value + 18)}
        >
          Показать ещё · осталось {filtered.length - limit}
        </Button>
      )}
    </Dialog>
  );
}
