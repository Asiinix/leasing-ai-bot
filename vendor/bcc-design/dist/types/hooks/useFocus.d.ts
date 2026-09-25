import React from 'react';
export type InputMethod = 'keyboard' | 'mouse';
/**
 * Хук устанавливает обработчик события на focusin и focusout
 * по конкретному типу события
 * @param ref
 * @param inputMethod (optional) Если параметр не задан, установит обработчик по любому событию фокуса
 */
export declare function useFocus(ref: React.MutableRefObject<HTMLElement | undefined | null>, inputMethod?: InputMethod): [boolean];
