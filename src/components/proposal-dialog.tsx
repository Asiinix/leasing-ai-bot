"use client";

import Image from "next/image";
import { useEffect, useMemo, useRef, useState } from "react";
import { Alert, Button, Flex, Input, Typography } from "bcc-design";
import { appPath } from "@/lib/app-path";
import { calculationNote, createProposal, proposalNote, scheduleHead } from "@/lib/proposal";
import type { ClientType, Quote } from "@/lib/types";
import { Dialog } from "./dialog";
import logo from "./assets/bcc-leasing-logo.png";
import s from "./proposal-dialog.module.scss";

export function ProposalDialog({
  quote,
  model,
  clientType,
  onClose,
}: {
  quote: Quote;
  model: string;
  clientType: ClientType;
  onClose: () => void;
}) {
  const [client, setClient] = useState("");
  const [date] = useState(() => new Date());
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(false);
  const active = useRef(false);
  const locked = useRef(false);
  useEffect(() => {
    active.current = true;
    return () => {
      active.current = false;
    };
  }, []);
  const proposal = useMemo(
    () => createProposal(quote, model, clientType, client, date),
    [quote, model, clientType, client, date],
  );
  async function download() {
    if (locked.current) return;
    locked.current = true;
    setBusy(true);
    setError(false);
    try {
      const [{ renderProposalPdf }, fontResponse, logoResponse] = await Promise.all([
        import("@/lib/proposal-pdf"),
        fetch(appPath("/fonts/NotoSans-Regular.ttf")),
        fetch(logo.src),
      ]);
      if (!fontResponse.ok || !logoResponse.ok) throw new Error("assets");
      const [fontBuffer, logoBuffer] = await Promise.all([
        fontResponse.arrayBuffer(),
        logoResponse.arrayBuffer(),
      ]);
      const font = btoa(
        Array.from(new Uint8Array(fontBuffer), (byte) => String.fromCharCode(byte)).join(""),
      );
      if (!active.current) return;
      const blob = renderProposalPdf(proposal, font, new Uint8Array(logoBuffer));
      if (!active.current) return;
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = proposal.filename;
      document.body.append(link);
      link.click();
      link.remove();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
    } catch {
      if (active.current) setError(true);
    } finally {
      locked.current = false;
      if (active.current) setBusy(false);
    }
  }
  return (
    <Dialog
      title="Коммерческое предложение"
      description="Предварительный просмотр"
      wide
      onClose={() => {
        active.current = false;
        onClose();
      }}
      footer={
        <Flex direction="column" gap={12}>
          {error && (
            <Alert variant="error" fullWidth autoCloseDelay={null} disableTruncate>
              Не удалось сформировать PDF. Попробуйте скачать ещё раз.
            </Alert>
          )}
          <Button view="accentPrimary" size="l" fullWidth disabled={busy} onClick={download}>
            {busy ? "Формируем PDF…" : "Скачать PDF"}
          </Button>
          <span role="status" className={s.status}>
            {busy ? "Формируем документ, пожалуйста, подождите." : ""}
          </span>
        </Flex>
      }
    >
      <Flex direction="column" gap={24}>
        <Input
          fullWidth
          label="Имя клиента или название компании (необязательно)"
          value={client}
          maxLength={500}
          disabled={busy}
          onChange={(event) => setClient(event.target.value)}
        />
        <article className={s.preview} aria-label="Предварительный просмотр предложения">
          <Image src={logo} alt="BCC Leasing" className={s.logo} />
          <h2>Коммерческое предложение</h2>
          <p>BCC Leasing • {proposal.date}</p>
          <dl className={s.fields}>
            {proposal.fields.map(([label, value]) => (
              <div key={label}>
                <dt>{label}</dt>
                <dd>{value}</dd>
              </div>
            ))}
          </dl>
          <p>{calculationNote}</p>
          <p>{proposalNote}</p>
          <h3>График платежей</h3>
          <div className={s.tableScroll} tabIndex={0} role="region" aria-label="График платежей">
            <table>
              <thead>
                <tr>
                  {scheduleHead.map((text) => (
                    <th key={text} scope="col">
                      {text}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {proposal.schedule.map((row) => (
                  <tr key={row[0]}>
                    {row.map((cell, index) => (
                      <td key={index}>{cell}</td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </article>
        <Typography.Caption view="large" color="secondary">
          Документ формируется на вашем устройстве.
        </Typography.Caption>
      </Flex>
    </Dialog>
  );
}
