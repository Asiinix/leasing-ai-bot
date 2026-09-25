"use client";

import { useMemo, useState } from "react";
import { Select } from "bcc-design";
import type { LeaseModel } from "@/lib/types";
import { modelLabel } from "@/lib/vehicle";

export { modelLabel };

export function ModelPicker({
  models,
  selected,
  loading,
  onSelect,
}: {
  models: LeaseModel[];
  selected: number;
  loading: boolean;
  onSelect: (model: LeaseModel) => void;
}) {
  const [query, setQuery] = useState("");
  const options = useMemo(() => {
    // Встроенный фильтр Select ищет только по подписи одной подстрокой. Ищем по словам
    // в марке, модели и продавце, как раньше, поэтому фильтрация своя.
    const words = query.toLocaleLowerCase().trim().split(/\s+/);
    return (
      models
        .filter(
          (model) =>
            model.id === selected ||
            words.every((word) =>
              `${model.brand} ${model.name} ${model.partnerName}`
                .toLocaleLowerCase()
                .includes(word),
            ),
        )
        // Выбранная модель — первой: scrollToSelected у виртуализированного списка
        // из 1000+ опций не докручивает и сыплет предупреждениями в консоль.
        .sort((a, b) => Number(b.id === selected) - Number(a.id === selected))
        .map((model) => ({ value: model.id, label: modelLabel(model), hint: model.partnerName }))
    );
  }, [models, query, selected]);
  return (
    <Select
      fullWidth
      size="lg"
      label="Автомобиль"
      placeholder="Марка, модель или продавец"
      mobileTitle="Выберите автомобиль"
      searchPlaceholder="Марка, модель или продавец"
      hint={
        models.find((model) => model.id === selected)?.partnerName ??
        "Справочник моделей и продавцов"
      }
      noDataText="Ничего не нашли. Попробуйте название марки латиницей."
      loading={loading}
      disabled={loading}
      allowSearch
      filterOptions={false}
      virtualize
      options={options}
      value={selected}
      onSearch={setQuery}
      onClose={() => setQuery("")}
      onChange={({ value }) => {
        // Повторный клик по выбранной опции снимает выбор (value = null) — модель
        // в калькуляторе обязательна, поэтому такой клик игнорируем.
        const model = models.find((item) => item.id === value);
        if (model) onSelect(model);
      }}
    />
  );
}
