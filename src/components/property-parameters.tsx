"use client";

import { Alert, Card, Flex, Input, Tag, Typography } from "bcc-design";
import { money } from "@/lib/format";
import { MoneyInput } from "./money-input";

export interface PropertyDraft {
  name: string;
  price: number;
}

export function PropertyParameters({
  value,
  onChange,
}: {
  value: PropertyDraft;
  onChange: (value: PropertyDraft) => void;
}) {
  return (
    <Flex direction="column" gap={24}>
      <Input
        fullWidth
        label="Объект недвижимости"
        placeholder="Например, офис или склад"
        value={value.name}
        onChange={(event) => onChange({ ...value, name: event.target.value })}
      />
      <MoneyInput
        label="Стоимость недвижимости"
        value={value.price}
        placeholder="Укажите стоимость"
        hint="Можно указать ориентировочную стоимость объекта."
        onChange={(price) => onChange({ ...value, price })}
      />
      <Alert
        variant="info"
        fullWidth
        autoCloseDelay={null}
        title="Подбор объектов с Krisha.kz появится позже. Сейчас можно указать объект и стоимость вручную."
      />
    </Flex>
  );
}

export function PropertySummary({ value }: { value: PropertyDraft }) {
  return (
    <Card size="m" type="primary" height="auto">
      <section aria-label="Недвижимость">
        <Flex direction="column" gap={24}>
          <Typography.Title tag="h2" view="block">
            Недвижимость
          </Typography.Title>
          <Tag size="sm" color="neutral">
            Krisha.kz · скоро
          </Tag>
          <Flex direction="column" gap={8}>
            <Typography.Paragraph weight="semibold">
              {value.name || "Укажите объект недвижимости"}
            </Typography.Paragraph>
            <Typography.Paragraph>
              {value.price ? money(value.price) : "Стоимость пока не указана"}
            </Typography.Paragraph>
          </Flex>
          <Typography.Paragraph color="secondary">
            Расчёт лизинга недвижимости пока недоступен. Подбор объектов и условий появится в этом
            разделе.
          </Typography.Paragraph>
        </Flex>
      </section>
    </Card>
  );
}
