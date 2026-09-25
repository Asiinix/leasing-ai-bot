'use client';

import React from 'react';
import debounce from 'lodash/debounce';

import { BaseSlider } from './BaseSlider/BaseSlider';
import type { RcSliderValueType, SliderProps, SliderValue, StateModifiers } from './Slider.types';
import { SliderTooltip } from './SliderTooltip/SliderTooltip';
import { prepareSliderInnerState } from './utils';

import './Slider.scss';

import { block } from '../../utilities/cn';

const b = block('slider');

export const Slider = React.forwardRef(function Slider(
  {
    value,
    defaultValue = 0,
    size = 's',
    min = 0,
    max = 100,
    step = 1,
    marksCount = 2,
    availableValues,
    hasTooltip = false,
    hasIndicator = false,
    error = false,
    disabled = false,
    debounceDelay = 0,
    onBlur,
    onUpdate,
    onUpdateComplete,
    onFocus,
    autoFocus = false,
    tabIndex,
    'aria-label': ariaLabelForHandle,
    'aria-labelledby': ariaLabelledByForHandle,
  }: SliderProps,
  ref: React.ForwardedRef<HTMLDivElement>,
) {
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const handleUpdate = React.useCallback(
    debounce((changedValue: RcSliderValueType) => onUpdate?.(changedValue as SliderValue), debounceDelay),
    [onUpdate, debounceDelay],
  );

  // eslint-disable-next-line react-hooks/exhaustive-deps
  const handleUpdateComplete = React.useCallback(
    debounce((changedValue: RcSliderValueType) => onUpdateComplete?.(changedValue as SliderValue), debounceDelay),
    [onUpdateComplete, debounceDelay],
  );

  React.useEffect(() => {
    return () => {
      handleUpdate.cancel();
      handleUpdateComplete.cancel();
    };
  }, [handleUpdate, handleUpdateComplete]);

  const innerState = prepareSliderInnerState({
    availableValues,
    defaultValue,
    marksCount,
    max,
    min,
    step,
    value,
  });
  const stateModifiers: StateModifiers = {
    size,
    error: error && !disabled,
    disabled,
    hasTooltip: Boolean(hasTooltip),
    hasIndicator,
    rtl: false,
  };

  return (
    <div className={b(null)} ref={ref}>
      <div className={b('top', { size, hasTooltip })}></div>
      <BaseSlider
        value={innerState.value}
        defaultValue={innerState.defaultValue}
        min={innerState.min}
        max={innerState.max}
        step={innerState.step}
        range={innerState.range}
        marks={innerState.marks}
        disabled={disabled}
        onBlur={onBlur}
        onFocus={onFocus}
        onChange={handleUpdate}
        onChangeComplete={handleUpdateComplete}
        stateModifiers={stateModifiers}
        autoFocus={autoFocus}
        tabIndex={tabIndex}
        handleRender={
          hasTooltip
            ? (originHandle, handleProps) => {
                const styleProp = stateModifiers.rtl ? 'right' : 'left';
                return (
                  <React.Fragment>
                    {originHandle}
                    <SliderTooltip
                      value={handleProps.value}
                      className={b('tooltip')}
                      style={{
                        insetInlineStart: originHandle.props.style?.[styleProp],
                      }}
                      stateModifiers={stateModifiers}
                    />
                  </React.Fragment>
                );
              }
            : undefined
        }
        reverse={stateModifiers.rtl}
        ariaLabelForHandle={ariaLabelForHandle}
        ariaLabelledByForHandle={ariaLabelledByForHandle}
      ></BaseSlider>
    </div>
  );
});


Slider.displayName = 'Slider';
