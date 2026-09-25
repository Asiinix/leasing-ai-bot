import { MaskitoOptions } from '@maskito/core';
import { Writable } from 'utility-types';
import { InputMaskProps } from './InputMask.type';
/**
 * Парсит MaskProps и возвращает соответсвующее опции для маски.
 * */
export declare const propsToOptions: (props: InputMaskProps | undefined) => MaskitoOptions;
/**
 * Сливает опции для маски в тип MaskitoOptions.
 * Note: мутирует объект.
 * */
type WritableMaskitoOptions = Writable<MaskitoOptions>;
export declare const mergeMaskOptions: (opt1: WritableMaskitoOptions, opt2: WritableMaskitoOptions) => void;
export {};
