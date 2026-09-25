import { SelectOptionType } from './components/SelectOption';
import { SelectMultipleValue, SelectSingleValue, SelectValue } from './Select.type';
/**
 * Функция определяет новое значение которое передается в onChange когда multiple = true
 *
 * 1. Определить является ли текущее значение (currentValue) SelectMultipleValue или undefined или null
 *    a. Нет - возвращаем [selectedValue]
 *    b. Да - делаем шаг 2
 * 2. Определить есть ли нажатое значение (selectedValue) в currentValue
 *    a. Нет - делаем [...currentValue, selectedValue]
 *    b. Да - делаем currentValue.filter
 * */
export declare const getNewMultipleSelectValue: (selectedValue: SelectSingleValue, currentValue: SelectValue | undefined) => SelectMultipleValue;
export declare const getNewSingleSelectValue: (selectedValue: SelectSingleValue, currentValue: SelectValue | undefined) => SelectValue;
/**
 * SelectOptionType[] > { [value]: label, ... }
 * */
export declare const getSelectOptionsMap: (options: SelectOptionType[]) => {};
/**
 * Функция фильтрует опции
 * */
export declare const getSelectFilteredOptions: (query: string, items: SelectOptionType[]) => SelectOptionType[];
/**
 * Функция определяет значение placeholder для инпута
 * */
export declare const getSelectPlaceholderValue: (mode: "search" | "value", inputValue: string, placeholder: string | undefined) => string | undefined;
/**
 * Функция определяет значение value для инпута селекта
 * */
export declare const getInputSelectValue: (value: undefined | SelectValue, valueMap: ReturnType<typeof getSelectOptionsMap>, separator?: string) => string;
