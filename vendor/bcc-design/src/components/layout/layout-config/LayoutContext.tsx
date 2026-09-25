import { createContext, ReactNode, useContext, useMemo } from 'react';

import { Breakpoints, breakpoints, BreakpointsKeys } from './breakpoints';
import { useCurrentActiveMediaQuery } from './hooks/useCurrentActiveMediaQuery';
import { getClosestMediaPropsFactory, isMediaActiveFactory } from './utils';

/**
 * Context
 * */
type LayoutContext = {
  activeBreakpoint: BreakpointsKeys;
  breakpoints: Breakpoints;

  /**
   * Returns a boolean value if the passed value is equal to or greater than the currently active media expression.
   * It is necessary to describe the logic of adaptive behavior of elements taking into account the mobile-first approach
   * ```tsx
   * import { useLayoutContext } from 'bcc-design';
   *
   * // this example of code will be shown on l, xl, xxl and xxxl screen sizes
   * const Component = () => {
   * const {isMediaActive} = useLayoutContext();
   *
   *  return (
   *      <>{isMediaActive('xl') ? <Text>i'm rendering on "l", "xl", "xxl" and "xxxl" screen sizes</Text> : null}</>;
   *  );
   * };
   * ```
   */
  isMediaActive: ReturnType<typeof isMediaActiveFactory>;
  /**
   * It works in a similar way to is Media Active, only it takes map as an argument in the keys of screen resolutions.
   * Returns the nearest available key value taking into account the mobile first approach.
   *
   * ```tsx
   * import { useLayoutContext } from 'bcc-design';
   *
   * const mapOfPropsByScreen = {
   *  xs: "I will be shown on 'xs' and 'sm' screen size",
   *  sm: "I will be shown on 'sm' and 'md' screen size",
   *  md: "I will be shown on 'md' and 'lg' screen size",
   * };
   *
   * const Component = () => {
   *  const {getClosestMediaProps} = useLayoutContext();
   *
   *  return <Text>{mapOfPropsByScreen(mapOfPropsByScreen)}</Text>;
   * };
   * ```
   */
  getClosestMediaProps: ReturnType<typeof getClosestMediaPropsFactory>;
};
const LayoutContext = createContext<LayoutContext>(null!);
export const useLayoutContext = () => {
  const layoutContext = useContext(LayoutContext);

  if (!layoutContext) {
    throw Error('layoutContext is not reachable.');
  }

  return layoutContext;
};

/**
 * Provider
 * */
export type LayoutProviderProps = {
  children?: ReactNode;
  initialMediaQuery?: BreakpointsKeys;

  // breakpoints?: Partial<Breakpoints>;
};
export const LayoutProvider = ({ children, initialMediaQuery }: LayoutProviderProps) => {
  const activeBreakpoint = useCurrentActiveMediaQuery(breakpoints, initialMediaQuery);

  const { isMediaActive, getClosestMediaProps } = useMemo(
    () => ({
      isMediaActive: isMediaActiveFactory(activeBreakpoint),
      getClosestMediaProps: getClosestMediaPropsFactory(activeBreakpoint),
    }),
    [activeBreakpoint],
  );

  return (
    <LayoutContext.Provider
      value={{
        isMediaActive,
        getClosestMediaProps,
        activeBreakpoint,
        breakpoints,
      }}
    >
      {children}
    </LayoutContext.Provider>
  );
};
