import React, { HTMLAttributes } from 'react';
import { TextSkeletonProps } from '../../type';
import './Paragraph.scss';
type NativeProps = HTMLAttributes<HTMLSpanElement>;
export type ParagraphProps = Omit<NativeProps, 'color'> & {
    /**
     * HTML тег
     */
    tag?: 'span' | 'div' | 'p';
    /**
     * [Вариант начертания]
     */
    view?: 'medium' | 'small';
    /**
     * Делает цифры моноширинными
     */
    monospaceNumbers?: boolean;
    /**
     * Декорация текста
     */
    decoration?: 'underline' | 'line-through';
    /**
     * Толщина шрифта
     */
    weight?: 'regular' | 'medium' | 'bold';
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
type ParagraphElementType = HTMLSpanElement | HTMLDivElement;
export declare const Paragraph: React.ForwardRefExoticComponent<Omit<NativeProps, "color"> & {
    /**
     * HTML тег
     */
    tag?: "span" | "div" | "p";
    /**
     * [Вариант начертания]
     */
    view?: "medium" | "small";
    /**
     * Делает цифры моноширинными
     */
    monospaceNumbers?: boolean;
    /**
     * Декорация текста
     */
    decoration?: "underline" | "line-through";
    /**
     * Толщина шрифта
     */
    weight?: "regular" | "medium" | "bold";
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
} & React.RefAttributes<ParagraphElementType>>;
export {};
