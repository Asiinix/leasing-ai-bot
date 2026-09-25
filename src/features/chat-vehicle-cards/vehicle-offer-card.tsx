"use client";

import { Card } from "bcc-design";
import { Check } from "lucide-react";
import { Button } from "@/components/ui";
import { money, percent, dateLabel } from "@/lib/format";
import { VehicleImage } from "../fixed-price-catalog/vehicle-image";
import type { VehicleOffer } from "./search";

export function VehicleOfferCard({
  offer,
  disabled,
  onChoose,
}: {
  offer: VehicleOffer;
  disabled: boolean;
  onChoose: () => void;
}) {
  const { vehicle, quote, terms } = offer;
  const name = `${vehicle.brand} ${vehicle.model}`;
  return (
    <article className="vehicle-offer-card" aria-label={`${name} — предложение`}>
      <Card height="auto">
        <VehicleImage vehicle={vehicle} compact />
        <div className="vehicle-card-content">
          <span className="vehicle-offer-badge">
            <Check size={12} /> В бюджете
          </span>
          <h3 title={name}>{name}</h3>
          <strong className="vehicle-offer-payment">
            {money(quote.monthlyPayment)} <span>в месяц</span>
          </strong>
          <dl className="vehicle-offer-details">
            <div>
              <dt>Стоимость</dt>
              <dd>{money(quote.price)}</dd>
            </div>
            <div>
              <dt>Аванс · {percent(quote.rate.advancePercent)}%</dt>
              <dd>{money(quote.advanceAmount)}</dd>
            </div>
            <div>
              <dt>Срок</dt>
              <dd>{quote.rate.months} мес.</dd>
            </div>
          </dl>
          {vehicle.priceKind === "estimate" && (
            <span className="vehicle-estimate-label">Демо-оценка цены</span>
          )}
          <details className="vehicle-offer-more">
            <summary>Условия и источники</summary>
            <div>
              <p>
                {vehicle.trim ?? "Комплектация уточняется"}
                {vehicle.modelYear ? ` · ${vehicle.modelYear}` : ""}
              </p>
              <p>{vehicle.partnerName}</p>
              <p>Ставка {percent(quote.rate.annualRate)}% годовых.</p>
              <p>
                {vehicle.priceKind === "estimate"
                  ? `${vehicle.priceBasis}. Ориентировочная демо-цена, уточните у продавца.`
                  : `Цена из прайса от ${dateLabel(vehicle.priceCheckedAt!)}.`}
              </p>
              <p>
                {terms.source === "snapshot"
                  ? `Тарифы от ${dateLabel(terms.checkedAt)}.`
                  : "Расчёт по текущим тарифам."}{" "}
                Без страхования и комиссий.
              </p>
              {vehicle.priceKind === "reference" && vehicle.priceSourceUrl && (
                <a
                  className="vehicle-price-source"
                  href={vehicle.priceSourceUrl}
                  target="_blank"
                  rel="noreferrer"
                >
                  Источник цены ↗
                </a>
              )}
            </div>
          </details>
          <Button
            view="accentPrimary"
            fullWidth
            size="m"
            disabled={disabled}
            onClick={onChoose}
            aria-label={disabled ? `Повторите подбор: ${name}` : `Выбрать ${name}`}
          >
            {disabled ? "Повторить" : "Выбрать"}
          </Button>
        </div>
      </Card>
    </article>
  );
}
