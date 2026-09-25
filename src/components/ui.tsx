"use client";

import { forwardRef, type ButtonHTMLAttributes, type AnchorHTMLAttributes } from "react";
import { Button as BccButton, type ButtonProps } from "bcc-design";

type AppButtonProps = Omit<ButtonHTMLAttributes<HTMLButtonElement>, "onClick"> &
  Pick<
    ButtonProps,
    "view" | "size" | "iconLeft" | "iconRight" | "fullWidth" | "loading" | "onClick"
  >;

// Keep the app's native button API, including refs and form submit behavior.
export const Button = forwardRef<HTMLButtonElement, AppButtonProps>(function Button(
  { type = "button", view = "neutral", size = "m", ...props },
  ref,
) {
  return <BccButton {...props} ref={ref} htmlType={type} view={view} size={size} />;
});

export function ButtonLink(props: AnchorHTMLAttributes<HTMLAnchorElement>) {
  return <BccButton {...props} view="accentPrimary" size="l" fullWidth />;
}
