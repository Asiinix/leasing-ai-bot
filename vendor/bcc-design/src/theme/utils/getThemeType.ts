import { RealTheme, ThemeType } from '../types';

import { DARK_THEMES } from '../contants';

export function getThemeType(theme: RealTheme): ThemeType {
  return DARK_THEMES.includes(theme as string) ? 'dark' : 'light';
}
