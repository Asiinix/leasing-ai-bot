import React from 'react';
import type { StateModifiers } from '../Slider.types';
import './SliderTooltip.scss';
type SliderTooltipProps = {
    value: number;
    className?: string;
    style?: React.CSSProperties;
    stateModifiers: Omit<StateModifiers, 'hasTooltip'>;
};
export declare const SliderTooltip: ({ value, className, style, stateModifiers }: SliderTooltipProps) => React.JSX.Element;
export {};
