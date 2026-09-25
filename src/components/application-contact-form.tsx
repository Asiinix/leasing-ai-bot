"use client";

import { useState } from "react";
import { Checkbox, Flex, Input, Typography } from "bcc-design";

export type ApplicationContact = {
  fullName: string;
  email: string;
  phone: string;
  iin: string;
  consent: boolean;
};
type Field = keyof ApplicationContact;

const fields = [
  {
    name: "fullName",
    label: "ФИО",
    autoComplete: "name",
    placeholder: "Иванов Иван Иванович",
    maxLength: 200,
    type: "text",
    hint: "Фамилия, имя и отчество (при наличии)",
  },
  {
    name: "email",
    label: "Электронная почта",
    autoComplete: "email",
    placeholder: "name@example.kz",
    maxLength: 254,
    type: "email",
  },
  {
    name: "phone",
    label: "Телефон",
    autoComplete: "tel",
    placeholder: "+7 (700) 123-45-67",
    maxLength: 30,
    type: "tel",
  },
  {
    name: "iin",
    label: "ИИН",
    autoComplete: "off",
    placeholder: "12 цифр",
    maxLength: 12,
    type: "text",
    hint: "Индивидуальный идентификационный номер",
  },
] as const;

function validate(value: ApplicationContact): Record<Field, string> {
  const phone = value.phone.trim();
  const digits = phone.replace(/\D/g, "");
  return {
    fullName: !value.fullName.trim()
      ? "Укажите ФИО."
      : value.fullName.trim().split(/\s+/).length < 2
        ? "Укажите фамилию и имя, отчество — при наличии."
        : "",
    email: !value.email.trim()
      ? "Укажите электронную почту."
      : !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.email.trim())
        ? "Проверьте адрес почты, например name@example.kz."
        : "",
    phone: !phone
      ? "Укажите телефон."
      : !/^\+?[\d\s()-]+$/.test(phone) || digits.length < 10 || digits.length > 15
        ? "Укажите от 10 до 15 цифр, например +7 (700) 123-45-67."
        : "",
    iin: !value.iin.trim()
      ? "Укажите ИИН."
      : !/^\d{12}$/.test(value.iin)
        ? "ИИН должен содержать 12 цифр."
        : "",
    consent: value.consent
      ? ""
      : "Для продолжения подтвердите согласие на обработку персональных данных.",
  };
}

export function ApplicationContactForm({
  value,
  onChange,
  onValid,
}: {
  value: ApplicationContact;
  onChange: (value: ApplicationContact) => void;
  onValid: (value: ApplicationContact) => void;
}) {
  const [touched, setTouched] = useState<Partial<Record<Field, boolean>>>({});
  const [submitted, setSubmitted] = useState(false);
  const errors = validate(value);
  const visibleError = (field: Field) => (submitted || touched[field] ? errors[field] : "");
  const touch = (field: Field) => setTouched((current) => ({ ...current, [field]: true }));
  const errorProps = (field: Field) => {
    const error = visibleError(field);
    return {
      "aria-invalid": Boolean(error),
      "aria-describedby": error ? `application-${field}-error` : undefined,
      error: error ? (
        <span id={`application-${field}-error`} aria-live="polite">
          {error}
        </span>
      ) : undefined,
    };
  };

  return (
    <form
      id="leasing-contact-form"
      noValidate
      onSubmit={(event) => {
        event.preventDefault();
        setSubmitted(true);
        const firstError = (Object.keys(errors) as Field[]).find((field) => errors[field]);
        if (firstError) {
          const input = event.currentTarget.elements.namedItem(firstError);
          if (input instanceof HTMLInputElement) input.focus();
          return;
        }
        onValid({
          ...value,
          fullName: value.fullName.trim(),
          email: value.email.trim(),
          phone: value.phone.trim(),
        });
      }}
    >
      <Flex direction="column" gap={16}>
        <Typography.Paragraph view="medium" weight="semibold">
          Контактные данные
        </Typography.Paragraph>
        {fields.map((field) => (
          <Input
            key={field.name}
            {...field}
            fullWidth
            required
            inputMode={field.name === "iin" ? "numeric" : undefined}
            value={value[field.name]}
            {...errorProps(field.name)}
            onBlur={() => touch(field.name)}
            onChange={(event) => onChange({ ...value, [field.name]: event.target.value })}
          />
        ))}
        <Checkbox
          name="consent"
          required
          fullWidth
          label="Я согласен на обработку моих персональных данных для рассмотрения заявки на лизинг"
          checked={value.consent}
          {...errorProps("consent")}
          onBlur={() => touch("consent")}
          onChange={(event) => {
            touch("consent");
            onChange({ ...value, consent: event.target.checked });
          }}
        />
        <Typography.Caption view="large" color="secondary">
          Данные остаются на этой странице до её перезагрузки и пока не отправляются в BCC.
        </Typography.Caption>
      </Flex>
    </form>
  );
}
