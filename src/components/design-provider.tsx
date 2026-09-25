"use client";

import { ThemeProvider } from "bcc-design";

export function DesignProvider({ children }: { children: React.ReactNode }) {
  return (
    <ThemeProvider theme="bcc-light" rootClassName="leasing-theme" nativeScrollbar>
      {children}
    </ThemeProvider>
  );
}
