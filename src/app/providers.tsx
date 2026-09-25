"use client";

import { createContext, useContext, useLayoutEffect, useState } from "react";
import { ThemeProvider } from "bcc-design";

export type ColorMode = "light" | "dark";
export const COLOR_MODE_KEY = "bcc-leasing-color-mode";

const ColorModeContext = createContext<{ mode: ColorMode; toggle: () => void }>({
  mode: "light",
  toggle: () => {},
});

export const useColorMode = () => useContext(ColorModeContext);

function readStoredMode(): ColorMode {
  try {
    return localStorage.getItem(COLOR_MODE_KEY) === "dark" ? "dark" : "light";
  } catch {
    return "light";
  }
}

export function Providers({ children }: { children: React.ReactNode }) {
  // Сервер не знает сохраненную тему, поэтому первый рендер — светлый, как в HTML.
  // Сохраненная тема подхватывается до отрисовки кадра; класс на <body> заранее
  // ставит скрипт в layout, так что вспышки светлой темы нет.
  const [mode, setMode] = useState<ColorMode>("light");
  useLayoutEffect(() => {
    // Однократная синхронизация с localStorage после гидратации.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setMode(readStoredMode());
  }, []);
  function toggle() {
    const next = mode === "light" ? "dark" : "light";
    setMode(next);
    try {
      localStorage.setItem(COLOR_MODE_KEY, next);
    } catch {
      // Хранилище недоступно (приватный режим) — тема действует до перезагрузки.
    }
  }
  return (
    <ColorModeContext.Provider value={{ mode, toggle }}>
      <ThemeProvider theme={`bcc-leasing-${mode}`}>{children}</ThemeProvider>
    </ColorModeContext.Provider>
  );
}
