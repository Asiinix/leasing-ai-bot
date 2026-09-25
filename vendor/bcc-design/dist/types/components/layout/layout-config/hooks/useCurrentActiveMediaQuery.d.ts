import { BreakpointsKeys } from '../breakpoints';
import { MediaProps } from '../LayoutContext.type';
/**
 * @private - use `useLayoutContext` hook instead
 */
export declare const useCurrentActiveMediaQuery: (breakpointsMap: MediaProps<number>, initialBreakpoint?: BreakpointsKeys) => keyof import("../breakpoints").Breakpoints;
