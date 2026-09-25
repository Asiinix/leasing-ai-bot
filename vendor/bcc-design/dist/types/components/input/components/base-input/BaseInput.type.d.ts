import type { ChangeEvent, ElementType, HTMLAttributes, InputHTMLAttributes, MouseEvent, RefAttributes } from 'react';
import { FormControlProps } from '../../../form-control/index';
import type { InputMaskProps } from '../mask/InputMask.type';
type NativeInputProps = Omit<InputHTMLAttributes<HTMLInputElement>, 'size' | 'type' | 'value' | 'defaultValue' | 'onChange' | 'onClick' | 'enterKeyHint'>;
export type InputOnChangeHandler = (event: ChangeEvent<HTMLInputElement>, payload: InputPayloadValue) => void;
export type InputPayloadValue = {
    value: string;
    name: string;
};
export type BaseInputProps = 
/**
 * Пропсы нативного инпута
 */
NativeInputProps & 
/**
 * Пропсы FormControl
 * */
Omit<FormControlProps, 'filled' | 'children' | 'focused'> & {
    mask?: InputMaskProps;
    /**
     * Значение поля ввода
     */
    value?: string;
    /**
     * Начальное значение поля
     */
    defaultValue?: string;
    /**
     * Крестик для очистки поля
     */
    clear?: boolean;
    /**
     * Фокусировать ли инпут после очистки
     */
    focusAfterClear?: boolean;
    /**
     * Атрибут type
     */
    type?: 'number' | 'card' | 'email' | 'money' | 'password' | 'tel' | 'text';
    /**
     * Обработчик поля ввода
     */
    onChange?: InputOnChangeHandler;
    /**
     * Обработчик нажатия на кнопку очистки
     */
    onClear?: (event: MouseEvent<HTMLButtonElement>) => void;
    /**
     * Обработчик клика по полю
     */
    onClick?: (event: MouseEvent<HTMLDivElement>) => void;
    /**
     * Обработчик MouseDown по полю
     */
    onMouseDown?: (event: MouseEvent<HTMLDivElement>) => void;
    /**
     * Показать ли, что инпут в фокусе
     * */
    showFocus?: boolean;
    /**
     * Обработчик MouseUp по полю
     */
    onMouseUp?: (event: MouseEvent<HTMLDivElement>) => void;
    /**
     * Компонент FormControl
     */
    FormControlComponent?: ElementType<FormControlProps & RefAttributes<HTMLDivElement>>;
    /**
     * Идентификатор для систем автоматизированного тестирования
     */
    dataTestId?: string;
    /**
     * html аттрибуты для обертки инпута
     */
    wrapperProps?: HTMLAttributes<HTMLDivElement>;
};
export {};
