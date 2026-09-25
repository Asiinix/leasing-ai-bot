import { BreakpointsKeys } from './breakpoints';
import { IsMediaActive, MediaPartial } from './LayoutContext.type';
export declare const isMediaActiveFactory: (activeType: BreakpointsKeys) => IsMediaActive;
export declare const getClosestMediaPropsFactory: (currentActive: BreakpointsKeys) => <T>(medias?: MediaPartial<T>) => T | undefined;
