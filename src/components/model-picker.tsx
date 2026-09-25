"use client";

import { Input } from "bcc-design";
import { Button } from "./ui";

import { useMemo, useState } from "react";
import { CarFront, Check, Search } from "lucide-react";
import { Dialog } from "./dialog";
import type { LeaseModel } from "@/lib/types";

export function modelLabel(model?: LeaseModel) {
  if (!model) return "Выберите автомобиль";
  const brand = model.brand.toLowerCase().replace(/\b\w/g, (c) => c.toUpperCase());
  const name = model.name.toLowerCase().replace(/\b\w/g, (c) => c.toUpperCase());
  return name.toLowerCase().startsWith(brand.toLowerCase()) ? name : `${brand} ${name}`;
}

export function ModelPicker({
  models,
  selected,
  onSelect,
  onClose,
}: {
  models: LeaseModel[];
  selected: number;
  onSelect: (model: LeaseModel) => void;
  onClose: () => void;
}) {
  const [query, setQuery] = useState("");
  const filtered = useMemo(() => {
    const words = query.toLocaleLowerCase().trim().split(/\s+/);
    return models
      .filter((model) =>
        words.every((word) =>
          `${model.brand} ${model.name} ${model.partnerName}`.toLocaleLowerCase().includes(word),
        ),
      )
      .sort((a, b) => Number(b.id === selected) - Number(a.id === selected));
  }, [models, query, selected]);
  return (
    <Dialog title="Выберите автомобиль" onClose={onClose}>
      <p className="dialog-intro">
        Модель и продавец определяют доступные условия. Стоимость вы укажете отдельно.
      </p>
      <div className="search-field">
        <Input
          fullWidth
          leftAddon={<Search size={19} />}
          autoFocus
          aria-label="Поиск автомобиля"
          placeholder="Марка, модель или продавец"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
        />
      </div>
      <div className="model-list">
        {filtered.slice(0, 100).map((model) => (
          <Button
            key={model.id}
            className={`model-option ${model.id === selected ? "selected" : ""}`}
            onClick={() => onSelect(model)}
          >
            <span className="car-icon">
              <CarFront size={22} />
            </span>
            <span>
              <strong>{modelLabel(model)}</strong>
              <small>{model.partnerName}</small>
            </span>
            {model.id === selected && <Check size={19} className="green" />}
          </Button>
        ))}
        {!filtered.length && (
          <div className="empty-search">
            По этому запросу ничего не нашли.
            <br />
            Попробуйте название марки латиницей.
          </div>
        )}
      </div>
      <p className="hint">
        {filtered.length > 100
          ? `Показаны первые 100 из ${filtered.length}. Уточните поиск.`
          : `Найдено: ${filtered.length}`}{" "}
        · Без цен и проверки наличия
      </p>
    </Dialog>
  );
}
