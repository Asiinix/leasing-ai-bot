import React from 'react';
import type { SliderProps as RcSliderProps, SliderRef as RcSliderRef } from 'rc-slider';
export type SliderSize = 's' | 'm';
export type SliderValue = number | [number, number];
export type RcSliderValueType = number | number[];
export type SliderProps<ValueType = number | [number, number]> = {
    /** Значение элемента управления */
    value?: ValueType;
    /** Значение по умолчанию для элемента управления, используется, когда компонент не контролируется */
    defaultValue?: ValueType;
    /** Размер элемента управления */
    size?: SliderSize;
    /** Минимальное значение компонента */
    min?: number;
    /** Максимальное значение компонента */
    max?: number;
    /** Указывает массив доступных значений для ползунка */
    availableValues?: number[];
    /** Значение, которое добавляется или вычитается при каждом шаге ползунка. Это свойство будет проигнорировано, если установлены доступные значения. */
    step?: number;
    /** Количество текстовых меток под ползунком. Делит весь диапазон на равные части. Должно быть >=2. Это свойство будет проигнорировано, если установлены доступные значения. */
    marksCount?: number;
    /** Показывать подсказку с текущим значением компонента или нет */
    hasTooltip?: boolean;
    hasIndicator?: boolean;
    /** Указывает, что пользователь не может взаимодействовать с элементом управления */
    disabled: boolean;
    /** Текст ошибки для отображения */
    error?: boolean;
    /** Описывает состояние валидации */
    /** Указывает задержку (в миллисекундах) перед вызовом функции обработки */
    debounceDelay?: number;
    /** Вызывается, когда элемент управления получает фокус. Предоставляет событие фокуса в качестве аргумента обратного вызова */
    onFocus?: (e: React.FocusEvent<HTMLDivElement>) => void;
    /** Вызывается, когда элемент управления теряет фокус. Предоставляет событие фокуса в качестве аргумента обратного вызова */
    onBlur?: (e: React.FocusEvent<HTMLDivElement>) => void;
    /** Вызывается, когда значение ползунка обновляется пользователем. Предоставляет событие обновления в качестве аргумента обратного вызова */
    onUpdate?: (value: ValueType) => void;
    /** Вызывается при срабатывании ontouchend или onmouseup. Предоставляет событие обновления в качестве аргумента обратного вызова */
    onUpdateComplete?: (value: ValueType) => void;
    /** Атрибут autoFocus элемента управления */
    autoFocus?: boolean;
    /** Атрибут tabIndex элемента управления */
    tabIndex?: ValueType;
    /** Ссылка на свойства компонента Slider для фокусировки и снятия фокуса */
    apiRef?: React.RefObject<BaseSliderRefType>;
    'aria-label'?: string;
    'aria-labelledby'?: string;
};
export type SliderInnerState = {
    max: number;
    min: number;
} & Pick<RcSliderProps, 'value' | 'defaultValue' | 'step' | 'range' | 'marks'>;
export type StateModifiers = {
    size: SliderSize;
    error: boolean;
    disabled: boolean;
    hasTooltip: boolean;
    hasIndicator: boolean;
    rtl: boolean;
};
export type BaseSliderRefType = RcSliderRef;
