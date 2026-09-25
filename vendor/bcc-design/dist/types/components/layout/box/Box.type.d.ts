import React from 'react';
import { SpacingProps } from '../layout-config/spacing';
export type BoxRef<C extends React.ElementType> = React.ComponentPropsWithRef<C>['ref'];
export type BoxPropsWithTypedAttrs<T extends React.ElementType> = BoxProps<T> & Omit<React.ComponentPropsWithoutRef<T>, keyof BoxProps<T>>;
export interface BoxProps<T extends React.ElementType = 'div'> extends React.HTMLAttributes<T>, React.PropsWithChildren<Pick<React.CSSProperties, 'width' | 'height' | 'maxHeight' | 'maxWidth' | 'minHeight' | 'minWidth'>> {
    /**
     * Html тэг, который должен использоваться
     * */
    as?: T;
    /**
     * CSSProperties['overflow']
     * */
    overflow?: 'hidden' | 'x' | 'y' | 'auto';
    /**
     * Название класса
     * */
    className?: string;
    /**
     * Spacing для задания margin и padding с учетом Breakpoints
     * */
    spacing?: SpacingProps;
    /**
     * Идентификатор для систем автоматизированного тестирования
     * */
    dataTestId?: string;
}
