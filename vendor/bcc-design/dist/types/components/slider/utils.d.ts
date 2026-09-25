import type { SliderProps as RcSliderProps } from 'rc-slider';
import type { SliderInnerState, SliderProps } from './Slider.types';
export declare function getMarksFromInfoPoints({ infoPointsCount, max, min, }: {
    infoPointsCount: number;
    min: number;
    max: number;
}): RcSliderProps['marks'];
/**
 * Calculates the basic properties of the Slider component depending on the passed parameters
 * @returns {SliderInnerState} Properties to pass to the Slider
 */
export declare function prepareSliderInnerState({ max, min, availableValues, defaultValue, marksCount, step, value, }: {
    max: number;
    min: number;
    availableValues: SliderProps['availableValues'];
    defaultValue: SliderProps['defaultValue'];
    marksCount: SliderProps['marksCount'];
    step: SliderProps['step'];
    value: SliderProps['value'];
}): SliderInnerState;
