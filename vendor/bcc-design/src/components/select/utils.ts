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
export const getNewMultipleSelectValue = (
  selectedValue: SelectSingleValue,
  currentValue: SelectValue | undefined,
): SelectMultipleValue => {
  if (selectedValue === null) {
    return selectedValue;
  }

  if (Array.isArray(currentValue)) {
    if (currentValue.includes(selectedValue)) {
      return currentValue.filter(v => v !== selectedValue);
    } else {
      return [...currentValue, selectedValue];
    }
  } else {
    return [selectedValue];
  }
};

export const getNewSingleSelectValue = (
  selectedValue: SelectSingleValue,
  currentValue: SelectValue | undefined,
): SelectValue => {
  if (selectedValue === currentValue) {
    return null;
  } else {
    return selectedValue;
  }
};

/**
 * SelectOptionType[] > { [value]: label, ... }
 * */
export const getSelectOptionsMap = (options: SelectOptionType[]) => {
  const initialValue = {};
  return options.reduce((acc, curr) => {
    return Object.assign(acc, { [curr.value]: curr.label });
  }, initialValue);
};

/**
 * Функция фильтрует опции
 * */
export const getSelectFilteredOptions = (query: string, items: SelectOptionType[]) => {
  if (!query) return items;
  return items.filter(item => item.label.toLowerCase().trim().includes(query.toLowerCase().trim()));
};

/**
 * Функция определяет значение placeholder для инпута
 * */
export const getSelectPlaceholderValue = (
  mode: 'search' | 'value',
  inputValue: string,
  placeholder: string | undefined,
) => {
  if (mode === 'search') {
    return inputValue || placeholder;
  } else {
    return placeholder;
  }
};

/**
 * Функция определяет значение value для инпута селекта
 * */
export const getInputSelectValue = (
  value: undefined | SelectValue,
  valueMap: ReturnType<typeof getSelectOptionsMap>,
  separator = ', ',
): string => {
  if (!value) return '';

  if (Array.isArray(value)) {
    return value.map(v => (valueMap as any)[v]).join(separator);
  } else {
    return (valueMap as any)[value];
  }
};
