import { MediaProps } from '../LayoutContext.type';

export type Breakpoints = {
  xxs: number;
  xs: number;
  sm: number;
  md: number;
  lg: number;
  xl: number;
};

export const breakpoints: Breakpoints = {
  xxs: 480,
  xs: 576,
  sm: 768,
  md: 992,
  lg: 1200,
  xl: 1600,
};

export type BreakpointsKeys = keyof Breakpoints;

export const breakpointsOrder = ['xxs', 'xs', 'sm', 'md', 'lg', 'xl'] as const;
export const breakpointsByOrder: MediaProps<number> = {
  xxs: 0,
  xs: 1,
  sm: 2,
  md: 3,
  lg: 4,
  xl: 5,
};
