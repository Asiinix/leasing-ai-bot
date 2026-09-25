import React from 'react';
import { ThemeType } from '../types';
import { getDarkMediaMatch, getSystemTheme } from '../utils/index';

function addListener(matcher: MediaQueryList, handler: (event: MediaQueryListEvent) => void): VoidFunction {
  const isLegacyMethod = typeof matcher.addEventListener !== 'function';

  if (isLegacyMethod) {
    matcher.addListener(handler);
  } else {
    matcher.addEventListener('change', handler);
  }

  return () => {
    if (isLegacyMethod) {
      matcher.removeListener(handler);
    } else {
      matcher.removeEventListener('change', handler);
    }
  };
}

export function useSystemTheme(): ThemeType {
  const [theme, setTheme] = React.useState<ThemeType>(getSystemTheme());

  React.useEffect(() => {
    function onChange(event: MediaQueryListEvent) {
      setTheme(event.matches ? 'dark' : 'light');
    }

    const matcher = getDarkMediaMatch();
    const unsubscribe = addListener(matcher, onChange);

    return () => unsubscribe();
  }, []);

  return theme;
}
