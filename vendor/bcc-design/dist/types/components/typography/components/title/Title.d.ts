import React, { HTMLAttributes } from 'react';
import { TextSkeletonProps } from '../../type';
import './Title.scss';
type NativeProps = HTMLAttributes<HTMLHeadingElement>;
export type TitleProps = Omit<NativeProps, 'color'> & {
    /**
     * HTML тег
     */
    tag: 'h1' | 'h2' | 'h3' | 'h4' | 'div';
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
    /**
     * Показать мобильный вид компонента, если такой реализован
     */
    isMobileView?: boolean;
};
type TitleElementType = HTMLHeadingElement | HTMLDivElement;
export declare const Title: React.ForwardRefExoticComponent<Omit<NativeProps, "color"> & {
    /**
     * HTML тег
     */
    tag: "h1" | "h2" | "h3" | "h4" | "div";
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
    /**
     * Показать мобильный вид компонента, если такой реализован
     */
    isMobileView?: boolean;
} & React.RefAttributes<TitleElementType>>;
export {};
