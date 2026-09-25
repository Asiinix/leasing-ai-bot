import React from 'react';
import { BreakpointsKeys } from './breakpoints';
export type MediaProps<T> = Record<BreakpointsKeys, T>;
export type MediaPartial<T> = Partial<MediaProps<T>>;
/**
 * Тип для объекта: { xs: <CSSProperties>, md: ... }
 *
 * Примеры:
 * AdaptiveProp<flexDirection>
 * flexDirection={{ xs: 'row', md: 'column', lg: 'row' }}
 * */
export type AdaptiveProp<T extends keyof React.CSSProperties> = React.CSSProperties[T] | MediaPartial<React.CSSProperties[T]>;
export interface IsMediaActive {
    (toCheck: BreakpointsKeys): boolean;
}
