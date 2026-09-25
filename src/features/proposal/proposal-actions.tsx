"use client";

import { ArrowLeft, Printer } from "lucide-react";
import { Button, ButtonLink } from "@/components/ui";
import { appPath } from "@/lib/app-path";

export function ProposalActions({ calculatorHref }: { calculatorHref?: string }) {
  return (
    <nav className="proposal-toolbar" aria-label="Действия с предложением">
      <ButtonLink href={calculatorHref ?? appPath("/")} className="proposal-back">
        <ArrowLeft size={17} /> К калькулятору
      </ButtonLink>
      <Button view="accentSecondary" onClick={() => window.print()}>
        <Printer size={17} /> Печать / PDF
      </Button>
    </nav>
  );
}
