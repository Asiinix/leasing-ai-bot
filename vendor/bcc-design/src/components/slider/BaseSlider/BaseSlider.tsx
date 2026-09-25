'use client';

import React from 'react';
import Slider from 'rc-slider';
import type { SliderProps, SliderRef } from 'rc-slider';

import type { StateModifiers } from '../Slider.types';

import './BaseSlider.scss';

import { block } from '../../../utilities/cn';

const b = block('base-slider');

type BaseSliderProps = { stateModifiers: StateModifiers } & Omit<
  SliderProps,
  'classNames' | 'prefixCls' | 'className' | 'pushable' | 'keyboard'
>;

export const BaseSlider = React.forwardRef<SliderRef, BaseSliderProps>(function BaseSlider(
  { stateModifiers, ...otherProps }: BaseSliderProps,
  ref: React.ForwardedRef<SliderRef>,
) {
  return (
    <Slider
      {...otherProps}
      ref={ref}
      className={b(stateModifiers)}
      pushable={false}
      dots={false}
      keyboard={true}
      classNames={{
        handle: b('handle', stateModifiers),
        rail: b('rail', stateModifiers),
        track: b('track', stateModifiers),
      }}
    ></Slider>
  );
});
