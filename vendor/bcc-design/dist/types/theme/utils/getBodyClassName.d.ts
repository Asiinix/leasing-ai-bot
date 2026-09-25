import { RealTheme } from '../types';
import type { BodyClassNameModifiers } from './updateBodyClassName';
export declare function getDeprecatedRootClassName(modifier?: Partial<BodyClassNameModifiers & {
    theme: RealTheme | boolean;
}>): string;
export declare function getRootClassName(modifier?: Partial<BodyClassNameModifiers & {
    theme: RealTheme | boolean;
}>, addition?: string[]): string;
export declare function getInitialRootClassName(props?: {
    theme?: RealTheme;
}): string;
