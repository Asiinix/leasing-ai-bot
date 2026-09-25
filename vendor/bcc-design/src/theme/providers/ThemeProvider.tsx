import React from 'react';
import { LayoutProvider, LayoutProviderProps } from '../../components/layout/layout-config/LayoutContext';
import { DEFAULT_DARK_THEME, DEFAULT_LIGHT_THEME, DEFAULT_THEME } from '../contants';
import { useSystemTheme } from '../hooks/useSystemTheme';
import { RealTheme, Theme } from '../types';
import { getDeprecatedRootClassName, getRootClassName } from '../utils/getBodyClassName';
import { updateBodyClassName } from '../utils/updateBodyClassName';

import { ThemeContext } from './ThemeContext';
import { ThemeSettingsContext } from './ThemeSettingsContext';

interface ThemeProviderExternalProps {}

interface ThemeProviderDefaultProps {
  children?: React.ReactNode;
  theme: Theme;
  systemLightTheme: RealTheme;
  systemDarkTheme: RealTheme;
  nativeScrollbar: boolean;
  scoped: boolean;
  rootClassName: string;
}

export interface ThemeProviderProps
  extends ThemeProviderExternalProps,
    Partial<ThemeProviderDefaultProps>,
    LayoutProviderProps,
    React.PropsWithChildren<NonNullable<unknown>> {}

export function ThemeProvider({
  theme = DEFAULT_THEME,
  systemLightTheme = DEFAULT_LIGHT_THEME,
  systemDarkTheme = DEFAULT_DARK_THEME,
  nativeScrollbar = false,
  scoped = false,
  rootClassName = '',
  children,
  initialMediaQuery,
}: ThemeProviderProps) {
  const systemTheme = (useSystemTheme() === 'light' ? systemLightTheme : systemDarkTheme) as RealTheme;
  const themeValue = theme === 'system' ? systemTheme : theme;

  const prevRootClassName = React.useRef('');

  React.useEffect(() => {
    if (!scoped) {
      updateBodyClassName(
        themeValue!,
        { 'native-scrollbar': nativeScrollbar },
        rootClassName,
        prevRootClassName.current,
      );
      prevRootClassName.current = rootClassName!;
    }
  }, [nativeScrollbar, themeValue, scoped, rootClassName]);

  const contextValue = React.useMemo(
    () => ({
      theme,
      themeValue,
    }),
    [theme, themeValue],
  );

  const themeSettingsContext = React.useMemo(
    () => ({ systemLightTheme, systemDarkTheme }),
    [systemLightTheme, systemDarkTheme],
  );

  return (
    <ThemeContext.Provider value={contextValue}>
      <ThemeSettingsContext.Provider value={themeSettingsContext}>
        <LayoutProvider initialMediaQuery={initialMediaQuery}>
          {scoped ? (
            <div
              className={getRootClassName({ theme: themeValue, 'native-scrollbar': nativeScrollbar }, [
                getDeprecatedRootClassName({
                  theme: themeValue,
                  'native-scrollbar': nativeScrollbar,
                }),
                rootClassName,
              ])}
            >
              {children}
            </div>
          ) : (
            children
          )}
        </LayoutProvider>
      </ThemeSettingsContext.Provider>
    </ThemeContext.Provider>
  );
}

ThemeProvider.displayName = 'ThemeProvider';
