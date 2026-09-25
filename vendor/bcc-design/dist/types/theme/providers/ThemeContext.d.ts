import React from 'react';
import { RealTheme, Theme } from '../types';
export interface ThemeContextProps {
    theme: Theme;
    themeValue: RealTheme;
}
export declare const initialValueThemeContext: ThemeContextProps;
export declare const ThemeContext: React.Context<ThemeContextProps>;
