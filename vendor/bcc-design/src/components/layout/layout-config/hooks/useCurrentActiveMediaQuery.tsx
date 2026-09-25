import React from 'react';

import { BreakpointsKeys } from '../breakpoints';
import { MediaProps } from '../LayoutContext.type';

const mockMediaQueryList: MediaQueryList = {
  media: '',
  matches: false,
  onchange: () => {},
  addListener: () => {},
  removeListener: () => {},
  addEventListener: () => {},
  removeEventListener: () => {},
  dispatchEvent: (_: Event) => true,
};

const makeCurrentActiveMediaExpressions = (mediaToValue: MediaProps<number>): MediaProps<string> => ({
  xxs: `(max-width: ${mediaToValue.xs - 1}px)`,
  xs: `(min-width: ${mediaToValue.xs}px) and (max-width: ${mediaToValue.sm - 1}px)`,
  sm: `(min-width: ${mediaToValue.sm}px) and (max-width: ${mediaToValue.md - 1}px)`,
  md: `(min-width: ${mediaToValue.md}px) and (max-width: ${mediaToValue.lg - 1}px)`,
  lg: `(min-width: ${mediaToValue.lg}px) and (max-width: ${mediaToValue.xl - 1}px)`,
  xl: `(min-width: ${mediaToValue.xl}px)`,
});

const safeMatchMedia = (query: string): MediaQueryList => {
  if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') {
    return mockMediaQueryList;
  }

  return window.matchMedia(query);
};

class Queries {
  private queryListsDecl: [BreakpointsKeys, MediaQueryList][] = [];

  constructor(breakpointsMap: MediaProps<number>) {
    const mediaToExpressionMap = makeCurrentActiveMediaExpressions(breakpointsMap);

    this.queryListsDecl = [
      // order important here
      ['xxs', safeMatchMedia(mediaToExpressionMap.xxs)],
      ['xs', safeMatchMedia(mediaToExpressionMap.xs)],
      ['sm', safeMatchMedia(mediaToExpressionMap.sm)],
      ['md', safeMatchMedia(mediaToExpressionMap.md)],
      ['lg', safeMatchMedia(mediaToExpressionMap.lg)],
      ['xl', safeMatchMedia(mediaToExpressionMap.xl)],
    ];
  }

  getCurrentActiveMedia(): BreakpointsKeys {
    const activeMedia = this.queryListsDecl.find(([_, queryList]) => queryList.matches);

    if (!activeMedia) {
      return 'xxs';
    }

    return activeMedia[0];
  }

  addListeners(fn: () => void) {
    this.queryListsDecl.forEach(([_, queryList]) => queryList.addEventListener('change', fn));
  }

  removeListeners(fn: () => void) {
    this.queryListsDecl.forEach(([_, queryList]) => queryList.removeEventListener('change', fn));
  }
}

/**
 * @private - use `useLayoutContext` hook instead
 */
export const useCurrentActiveMediaQuery = (
  breakpointsMap: MediaProps<number>,
  initialBreakpoint: BreakpointsKeys = 'lg',
) => {
  const [state, _setState] = React.useState<BreakpointsKeys>(initialBreakpoint);

  React.useLayoutEffect(() => {
    const queries = new Queries(breakpointsMap);

    const setState = () => {
      _setState(queries.getCurrentActiveMedia());
    };

    queries.addListeners(setState);

    setState();

    return () => {
      queries.removeListeners(setState);
    };
  }, [breakpointsMap]);

  return state;
};
