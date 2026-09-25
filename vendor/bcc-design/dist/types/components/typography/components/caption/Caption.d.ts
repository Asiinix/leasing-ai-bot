import React, { HTMLAttributes } from 'react';
import { TextSkeletonProps } from '../../type';
import './Caption.scss';
type NativeProps = HTMLAttributes<HTMLSpanElement>;
export type CaptionProps = Omit<NativeProps, 'color'> & {
    /**
     * HTML тег
     */
    tag?: 'span' | 'div' | 'p';
    /**
     * Толщина шрифта
     */
    weight?: 'regular' | 'medium' | 'bold';
    /**
     * Делает цифры моноширинными
     */
    monospaceNumbers?: boolean;
    /**
     * [Вариант начертания]
     */
    view?: 'medium' | 'small';
    /**
     * Декорация текста
     */
    decoration?: 'underline' | 'line-through';
    /**
     * Css-класс для стилизации (native prop)
     */
    className?: string;
    /**
     * Id компонента для тестов
     */
    dataTestId?: string;
    /**
     * Контент (native prop)
     */
    children?: React.ReactNode;
    /**
     * Количество строк
     */
    rowLimit?: '1' | '2' | '3' | 'none';
    /**
     * Показать скелетон
     */
    showSkeleton?: boolean;
    /**
     * Пропы для скелетона
     */
    skeletonProps?: TextSkeletonProps;
};
type CaptionElementType = HTMLSpanElement | HTMLDivElement;
export declare const Caption: React.ForwardRefExoticComponent<Omit<NativeProps, "color"> & {
    /**
     * HTML тег
     */
    tag?: "span" | "div" | "p";
    /**
     * Толщина шрифта
     */
    weight?: "regular" | "medium" | "bold";
    /**
     * Делает цифры моноширинными
     */
    monospaceNumbers?: boolean;
    /**
     * [Вариант начертания]
     */
    view?: "medium" | "small";
    /**
     * Декорация текста
     */
    decoration?: "underline" | "line-through";
    /**
     * Css-класс для стилизации (native prop)
     */
    className?: string;
    /**
     * Id компонента для тестов
     */
    dataTestId?: string;
    /**
     * Контент (native prop)
     */
    children?: React.ReactNode;
    /**
     * Количество строк
     */
    rowLimit?: "1" | "2" | "3" | "none";
    /**
     * Показать скелетон
     */
    showSkeleton?: boolean;
    /**
     * Пропы для скелетона
     */
    skeletonProps?: TextSkeletonProps;
} & React.RefAttributes<CaptionElementType>>;
export {};
