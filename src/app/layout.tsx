import type { Metadata, Viewport } from "next";
import { Providers } from "./providers";
import "./globals.css";

const title = "Калькулятор лизинга | BCC Leasing";
const description =
  "Рассчитайте ежемесячный платеж по автолизингу для ИП и ТОО и подберите срок и аванс под свой бюджет вместе с ИИ-помощником.";

// Иконка вкладки, иконка iOS и превью для соцсетей — файлы в src/app
// (icon.png, apple-icon.png, opengraph-image.png, twitter-image.png), Next подключает их сам.
// Абсолютный адрес для ссылок превью (og:image): явный NEXT_PUBLIC_SITE_URL,
// иначе публичный домен Railway, иначе локальный сервер.
const siteUrl =
  process.env.NEXT_PUBLIC_SITE_URL ??
  (process.env.RAILWAY_PUBLIC_DOMAIN
    ? `https://${process.env.RAILWAY_PUBLIC_DOMAIN}`
    : "http://localhost:3000");

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title,
  description,
  applicationName: "BCC Leasing",
  robots: { index: false, follow: false },
  openGraph: {
    type: "website",
    locale: "ru_KZ",
    siteName: "BCC Leasing",
    title,
    description,
  },
  twitter: { card: "summary_large_image", title, description },
};

// Цвет интерфейса браузера под фон страницы. meta-тег не принимает CSS-переменную,
// поэтому значения токенов фона: --b-color-gray-50 (светлая) и --b-color-gray-800 (темная).
export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#f4f5fa" },
    { media: "(prefers-color-scheme: dark)", color: "#47484c" },
  ],
};

// Ключ совпадает с COLOR_MODE_KEY в providers.tsx: константу из клиентского модуля
// серверный layout получает ссылкой, а не значением.
const colorModeScript = `try{if(localStorage.getItem("bcc-leasing-color-mode")==="dark")document.body.classList.replace("bcc-root_theme_bcc-leasing-light","bcc-root_theme_bcc-leasing-dark")}catch(e){}`;

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="ru">
      {/* Классы темы ставит ThemeProvider в эффекте, то есть только после гидратации.
          Дублируем их на сервере, чтобы токены DS действовали с первого кадра, а скрипт
          ниже до гидратации подменяет тему на сохраненную (отсюда suppressHydrationWarning). */}
      <body className="bcc-root bcc-root_theme_bcc-leasing-light" suppressHydrationWarning>
        <script dangerouslySetInnerHTML={{ __html: colorModeScript }} />
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
