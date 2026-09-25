import type { HTMLAttributes, ReactNode } from 'react';
export type BaseFormLabelType = 'inner' | 'outer';
type NativeProps = Omit<HTMLAttributes<HTMLDivElement>, 'onChange' | 'onClear'>;
export type BaseFormControlProps = NativeProps & {
    /**
     * Растянуть элемент на всю ширину
     */
    fullWidth?: boolean;
    /**
     * Отключенное состояние
     */
    disabled?: boolean;
    /**
     * Выбранное (фокус) состояние
     */
    focused?: boolean;
    /**
     * Заполненое состояние
     */
    filled?: boolean;
    /**
     * Отображение ошибки / состояние ошибки
     */
    error?: ReactNode | boolean;
    /**
     * Текст подсказки
     */
    hint?: ReactNode;
    /**
     * Лейбл компонента
     */
    label?: ReactNode;
    /**
     * Вид лейбла внутри / снаружи
     */
    labelType?: BaseFormLabelType;
    /**
     * Слот слева
     */
    leftAddon?: ReactNode;
    /**
     * Слот справа
     */
    rightAddon?: ReactNode;
    /**
     * Компонент поля (инпут, textarea и пр.)
     */
    children?: ReactNode;
};
export {};
