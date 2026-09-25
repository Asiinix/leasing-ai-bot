"use client";

import { ModalV2 } from "bcc-design";
import s from "./dialog.module.scss";

export function Dialog({
  title,
  description,
  children,
  footer,
  onClose,
  wide = false,
}: {
  title: string;
  description?: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
  onClose: () => void;
  wide?: boolean;
}) {
  return (
    <ModalV2
      open
      closable
      title={title}
      description={description}
      footer={footer}
      stickyHeader
      stickyFooter={Boolean(footer)}
      maxWidth={wide ? 880 : 560}
      width="100%"
      dialogClassName={wide ? s.wide : s.narrow}
      onClose={onClose}
    >
      {children}
    </ModalV2>
  );
}
