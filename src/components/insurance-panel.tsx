"use client";

import { useId } from "react";
import { Button, Select, Switch, Tooltip } from "bcc-design";
import { Info } from "lucide-react";
import { money, percent } from "@/lib/format";
import { calculateInsurance } from "@/features/insurance/calculate";
import {
  isVehicleCategory,
  VEHICLE_CATEGORIES,
  type VehicleCategory,
} from "@/features/insurance/categories";

export function InsurancePanel({
  enabled,
  onEnabledChange,
  category,
  onCategoryChange,
  price,
}: {
  enabled: boolean;
  onEnabledChange: (enabled: boolean) => void;
  category: VehicleCategory | null;
  onCategoryChange: (category: VehicleCategory) => void;
  price: number;
}) {
  const insurance = category ? calculateInsurance(price, category) : null;
  const tooltipId = useId();
  return (
    <section className="insurance-panel" aria-label="Расчёт страхования КАСКО">
      <Switch
        className="insurance-switch"
        role="switch"
        aria-label="Страхование КАСКО"
        aria-controls="insurance-details"
        label={
          <div className="insurance-title">
            <span>Страхование КАСКО</span>
            <Tooltip
              id={tooltipId}
              position="top"
              content="КАСКО — добровольное страхование автомобиля от повреждений и угона. Например, при ДТП, пожаре или стихийных бедствиях. Покрытие зависит от условий полиса."
            >
              <Button
                htmlType="button"
                view="ghost"
                size="s"
                className="insurance-help"
                aria-label="Что такое КАСКО?"
                aria-describedby={tooltipId}
              >
                <Info size={18} aria-hidden="true" />
              </Button>
            </Tooltip>
          </div>
        }
        hint="Расчёт стоимости за год"
        size="md"
        fullWidth
        reversed
        checked={enabled}
        disabled={!category}
        onChange={(_event, { checked }) => onEnabledChange(checked)}
      />
      {enabled && category && (
        <div className="insurance-details" id="insurance-details">
          <div className="insurance-category">
            <label className="field-label" htmlFor="insurance-category">
              Категория транспорта
            </label>
            <Select
              id="insurance-category"
              aria-label="Категория транспорта для страхования КАСКО"
              fullWidth
              allowSearch={false}
              value={category}
              options={Object.entries(VEHICLE_CATEGORIES).map(([value, item]) => ({
                value,
                label: `${item.label} · ${percent(item.ratePercent)}%`,
              }))}
              onChange={({ value }) => {
                if (isVehicleCategory(value)) onCategoryChange(value);
              }}
            />
          </div>
          <div className="insurance-cost" aria-live="polite" aria-atomic="true">
            {insurance ? (
              <>
                <div className="insurance-annual">
                  <span>КАСКО за год</span>
                  <strong data-testid="insurance-annual">{money(insurance.annual)}</strong>
                </div>
                <p className="insurance-formula">
                  {money(price)} × {percent(insurance.ratePercent)}% в год
                </p>
              </>
            ) : (
              <p>Укажите стоимость автомобиля для расчёта КАСКО.</p>
            )}
          </div>
          <p className="field-hint">КАСКО рассчитывается отдельно от платежа по лизингу.</p>
        </div>
      )}
    </section>
  );
}
