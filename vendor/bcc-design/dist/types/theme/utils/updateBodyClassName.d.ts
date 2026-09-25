import { RealTheme } from '../types';
export type BodyClassNameModifiers = {
    'native-scrollbar': boolean;
};
export declare function updateBodyClassName(newTheme: RealTheme, modifiers?: Partial<BodyClassNameModifiers>, customRootClassName?: string, prevCustomRootClassName?: string): void;
