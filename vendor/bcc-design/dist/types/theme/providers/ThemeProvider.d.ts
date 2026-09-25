import React from 'react';
import { LayoutProviderProps } from '../../components/layout/layout-config/LayoutContext';
import { RealTheme, Theme } from '../types';
interface ThemeProviderExternalProps {
}
interface ThemeProviderDefaultProps {
    children?: React.ReactNode;
    theme: Theme;
    systemLightTheme: RealTheme;
    systemDarkTheme: RealTheme;
    nativeScrollbar: boolean;
    scoped: boolean;
    rootClassName: string;
}
export interface ThemeProviderProps extends ThemeProviderExternalProps, Partial<ThemeProviderDefaultProps>, LayoutProviderProps, React.PropsWithChildren<NonNullable<unknown>> {
}
export declare function ThemeProvider({ theme, systemLightTheme, systemDarkTheme, nativeScrollbar, scoped, rootClassName, children, initialMediaQuery, }: ThemeProviderProps): React.JSX.Element;
export declare namespace ThemeProvider {
    var displayName: string;
}
export {};
