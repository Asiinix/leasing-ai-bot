import React from 'react';
import type { SliderProps, SliderRef } from 'rc-slider';
import type { StateModifiers } from '../Slider.types';
import './BaseSlider.scss';
export declare const BaseSlider: React.ForwardRefExoticComponent<{
    stateModifiers: StateModifiers;
} & Omit<SliderProps<number | number[]>, "className" | "classNames" | "prefixCls" | "pushable" | "keyboard"> & React.RefAttributes<SliderRef>>;
