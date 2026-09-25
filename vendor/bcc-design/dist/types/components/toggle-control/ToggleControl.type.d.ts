import { DetailedHTMLProps, LabelHTMLAttributes, ReactNode } from 'react';
type Align = 'start' | 'center' | 'end';
type Justify = 'start' | 'center' | 'end';
type NativeLabelProps = DetailedHTMLProps<LabelHTMLAttributes<HTMLLabelElement>, HTMLLabelElement>;
export type ToggleControlProps = {
    /**
     * Текст подписи
     */
    label?: ReactNode;
    /**
     * Текст подсказки снизу
     */
    hint?: ReactNode;
    /**
     * Выравнивание текста по вертикали
     */
    align?: Align;
    /**
     * Выравнивание текста по горизонтали
     */
    justify?: Justify;
    /**
     * Расположение чекбокса
     */
    reversed?: boolean;
    /**
     * Растягивать ли компонент на всю ширину
     */
    fullWidth?: boolean;
    /**
     * Текст подсказки снизу
     */
    disabled?: boolean;
    /**
     * Отображение ошибки
     */
    error?: ReactNode | boolean;
    /**
     * Пропсы для label
     */
    labelProps?: NativeLabelProps;
    /**
     * Идентификатор для систем автоматизированного тестирования
     */
    dataTestId?: string;
    /**
     * Дополнительный класс
     */
    className?: string;
    /**
     * В Control прокидывается 1 из 3 инпут элементов (Checkbox, Radio, Switch),
     * который контролируется компонентом ToggleControl
     */
    Control: ReactNode;
};
export {};
