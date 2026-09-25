import { ChangeEvent, InputHTMLAttributes } from 'react';
import { ToggleControlProps } from '../toggle-control/ToggleControl.type';
type NativeProps = InputHTMLAttributes<HTMLInputElement>;
export type SwitchValuePayload = {
    checked: boolean;
    name: string;
};
export type SwitchProps = Omit<NativeProps, 'size' | 'onChange'> & Omit<ToggleControlProps, 'Control'> & {
    size?: 'sm' | 'md';
    /**
     * Состояние переключателя: включен или выключен
     */
    checked?: boolean;
    /**
     * Обработчик переключения свитча
     */
    onChange?: (event: ChangeEvent<HTMLInputElement>, payload: SwitchValuePayload) => void;
    /**
     * Включен / выключен
     */
    disabled?: boolean;
};
export {};
