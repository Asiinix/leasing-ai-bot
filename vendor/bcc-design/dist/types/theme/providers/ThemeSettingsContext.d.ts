import React from 'react';
import type { RealTheme } from '../types';
export type ThemeSettings = {
    systemLightTheme: RealTheme;
    systemDarkTheme: RealTheme;
};
export type ThemeSettingsContextProps = ThemeSettings | undefined;
export declare const ThemeSettingsContext: React.Context<ThemeSettingsContextProps>;
