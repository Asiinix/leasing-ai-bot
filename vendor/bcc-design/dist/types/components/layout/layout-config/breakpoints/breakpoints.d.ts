import { MediaProps } from '../LayoutContext.type';
export type Breakpoints = {
    xxs: number;
    xs: number;
    sm: number;
    md: number;
    lg: number;
    xl: number;
};
export declare const breakpoints: Breakpoints;
export type BreakpointsKeys = keyof Breakpoints;
export declare const breakpointsOrder: readonly ["xxs", "xs", "sm", "md", "lg", "xl"];
export declare const breakpointsByOrder: MediaProps<number>;
