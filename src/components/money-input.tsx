"use client";

import { useId } from "react";
import { number, readMoney } from "@/lib/format";

export function MoneyInput({
  label,
  value,
  onChange,
  placeholder = "0",
  suffix = "₸",
  className = "",
  invalid = false,
}: {
  label: string;
  value: number;
  onChange: (value: number) => void;
  placeholder?: string;
  suffix?: string;
  className?: string;
  invalid?: boolean;
}) {
  const id = useId();
  return (
    <div className={`money-control ${className}`}>
      <label htmlFor={id}>{label}</label>
      <div className={`input-surface ${invalid ? "input-invalid" : ""}`}>
        <input
          id={id}
          type="text"
          inputMode="numeric"
          autoComplete="off"
          aria-invalid={invalid || undefined}
          value={value ? number(value) : ""}
          onChange={(event) => {
            const next = readMoney(event.target.value);
            if (Number.isSafeInteger(next) && next <= 999999999) onChange(next);
          }}
          placeholder={placeholder}
        />
        <span>{suffix}</span>
      </div>
    </div>
  );
}
