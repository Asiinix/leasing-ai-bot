import type { Metadata, Viewport } from "next";
import "@fontsource-variable/inter";
import "bcc-design/styles.css";
import { DesignProvider } from "@/components/design-provider";
import "./globals.css";
import "@/features/features.css";
import "./background.css";

export const metadata: Metadata = {
  title: "Калькулятор лизинга · BCC Leasing",
  description: "Рассчитайте платеж по лизингу и подберите условия под свой бюджет.",
  robots: { index: false, follow: false },
};
export const viewport: Viewport = { width: "device-width", initialScale: 1, themeColor: "#2f6ac1" };

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="ru">
      <body className="g-root g-root_theme_bcc-light leasing-theme">
        <DesignProvider>{children}</DesignProvider>
      </body>
    </html>
  );
}
