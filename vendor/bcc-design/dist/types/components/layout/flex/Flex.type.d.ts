import React from 'react';
import { BoxProps } from '../box';
import { AdaptiveProp } from '../layout-config/LayoutContext.type';
export type FlexRef<C extends React.ElementType> = React.ComponentPropsWithRef<C>['ref'];
export type FlexPropsWithTypedAttrs<T extends React.ElementType> = FlexProps<T> & Omit<React.ComponentPropsWithoutRef<T>, keyof FlexProps<T>>;
export interface FlexProps<T extends React.ElementType = 'div'> extends BoxProps<T> {
    /**
     * Свойство `flex-direction`
     */
    direction?: AdaptiveProp<'flexDirection'>;
    /**
     * Свойство `flex-grow`
     */
    grow?: true | React.CSSProperties['flexGrow'];
    /**
     * Свойство `flex-basis`
     */
    basis?: React.CSSProperties['flexBasis'];
    /**
     * Свойство `flex-shrink`
     */
    shrink?: React.CSSProperties['flexShrink'];
    /**
     * Свойство `align-`
     */
    alignContent?: AdaptiveProp<'alignContent'>;
    alignItems?: AdaptiveProp<'alignItems'>;
    alignSelf?: AdaptiveProp<'alignSelf'>;
    /**
     * Свойство `justify-`
     */
    justifyContent?: AdaptiveProp<'justifyContent'>;
    justifyItems?: AdaptiveProp<'justifyItems'>;
    justifySelf?: AdaptiveProp<'justifySelf'>;
    /**
     * Shortcut for:
     *
     * ```css
     *  justify-content: center;
     align-items: center;
     * ```
     */
    centerContent?: true;
    /**
     * Свойство `flex-wrap`
     *
     * If value equals `true`, add css property `flex-wrap: wrap`;
     */
    wrap?: true | React.CSSProperties['flexWrap'];
    gap?: AdaptiveProp<'gap'>;
    /**
     * display: inline-flex;
     */
    inline?: boolean;
    dataTestId?: string;
}
