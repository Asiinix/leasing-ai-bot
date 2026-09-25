import { ChangeEvent } from 'react';
/**
 * Функция генерирует React Event программно
 *
 * На вход получает реф на инпут и onChange коллбэк
 * @params input
 * @params onChange
 * */
export declare const generateInputEvent: (input: HTMLInputElement | null, onChange: (event: ChangeEvent<HTMLInputElement>) => void) => void;
