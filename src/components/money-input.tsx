"use client";

import { Input } from "bcc-design";
import { useId, type ReactNode } from "react";
import { number, readMoney } from "@/lib/format";

export function MoneyInput({
  label,
  value,
  onChange,
  placeholder = "0",
  suffix = "₸",
  className = "",
  invalid = false,
  children,
}: {
  label: string;
  value: number;
  onChange: (value: number) => void;
  placeholder?: string;
  suffix?: string;
  className?: string;
  invalid?: boolean;
  children?: ReactNode;
}) {
  const id = useId();
  return (
    <div className={`money-control ${className}`}>
      <label className="money-label" htmlFor={id}>
        {label}
      </label>
      <div
        className={children ? "money-surface money-surface_composite" : "money-surface"}
        data-invalid={invalid || undefined}
      >
        <Input
          id={id}
          fullWidth
          aria-label={label}
          error={invalid}
          rightAddon={<span className="money-suffix">{suffix}</span>}
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
        {children}
      </div>
    </div>
  );
}
