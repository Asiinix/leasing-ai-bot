"use client";

import { Input } from "bcc-design";
import { number, readMoney } from "@/lib/format";

export function MoneyInput({
  label,
  value,
  onChange,
  placeholder,
  hint,
  error,
}: {
  label: string;
  value: number;
  onChange: (value: number) => void;
  placeholder?: string;
  hint?: React.ReactNode;
  error?: React.ReactNode | boolean;
}) {
  return (
    <Input
      fullWidth
      size="lg"
      label={label}
      type="text"
      inputMode="numeric"
      autoComplete="off"
      placeholder={placeholder}
      value={value ? number(value) : ""}
      rightAddon="₸"
      hint={hint}
      error={error}
      onChange={(_, payload) => {
        const next = readMoney(payload.value);
        if (Number.isSafeInteger(next) && next <= 999999999) onChange(next);
      }}
    />
  );
}
