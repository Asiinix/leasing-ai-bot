import { FC, ReactNode } from 'react';
export type StackProps = {
    /**
     * Render prop, в который передается функция.
     * Функция принимает аргумент со значением z-index из текущего контекста.
     */
    children: (value: number) => ReactNode;
    /**
     * Исходное значение для z-index.
     * @default 5
     */
    value?: number;
};
export declare const Stack: FC<StackProps>;
