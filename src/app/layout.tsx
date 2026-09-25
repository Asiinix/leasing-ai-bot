import type { Metadata, Viewport } from "next";
import { Providers } from "./providers";
import "./globals.css";

export const metadata: Metadata = {
  title: "Калькулятор лизинга | BCC Leasing",
  description: "Рассчитайте платеж по лизингу и подберите условия под свой бюджет.",
  robots: { index: false, follow: false },
};
// Цвет адресной строки браузера: meta-тег не принимает CSS-переменную, значение —
// --b-color-cobalt-500 темы bcc-leasing-light.
export const viewport: Viewport = { width: "device-width", initialScale: 1, themeColor: "#2f6ac1" };

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
