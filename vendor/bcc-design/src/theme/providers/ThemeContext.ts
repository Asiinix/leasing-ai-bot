import React from 'react';
import { DEFAULT_LIGHT_THEME, DEFAULT_THEME } from '../contants';
import { RealTheme, Theme } from '../types';

export interface ThemeContextProps {
  theme: Theme;
  themeValue: RealTheme;
}

export const initialValueThemeContext: ThemeContextProps = {
  theme: DEFAULT_THEME,
  themeValue: DEFAULT_LIGHT_THEME,
};

export const ThemeContext = React.createContext(initialValueThemeContext);
ThemeContext.displayName = 'ThemeContext';
