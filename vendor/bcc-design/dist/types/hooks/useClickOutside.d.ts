import { RefObject } from 'react';
/**
 * ref - реф на dropdown чтобы useClickOutside не отрабатывал при клике внутри
 * handler - обработчик при клике вне рефа
 * excludes - массив доп HTML элементов при которых обработчик не отрабатывает
 * */
export declare const useClickOutside: (ref: RefObject<HTMLElement>, handler?: (event?: MouseEvent) => void, excludes?: (HTMLElement | null)[]) => void;
