import { CSSProperties } from 'react';
import { InputProps } from '../input';
import { SelectOptionType } from './components/SelectOption';


/** Base Select Types */
export type SelectOptionWrapType = 'ellipsis' | 'wrap';
export type SelectOptionsWrap = {
  label?: SelectOptionWrapType;
  hint?: SelectOptionWrapType;
};

export type SelectSingleValue = null | string | number;
export type SelectMultipleValue = null | (string | number)[];
export type SelectValue = SelectSingleValue | SelectMultipleValue;

export type SelectValuePayload = {
  value: SelectValue;
  name: string;

  /** Нужно для правильной работы с Form.Item */
  target?: {
    value: SelectValue;
  };
};
export type SelectChangeHandler = (payload: SelectValuePayload) => void;

/** Utility Select Types */
export type SelectInternalState = {
  mode: 'search' | 'value';
  value: SelectValue;
  options: SelectOptionType[];
  search: string;
};

/** Select Props */
type InheritedInputProps = Pick<
  InputProps,
  | 'clear'
  | 'focusAfterClear'
  | 'wrapperProps'
  | 'fullWidth'
  | 'error'
  | 'hint'
  | 'label'
  | 'labelType'
  | 'leftAddon'
  | 'rightAddon'
  | 'disabled'
  | 'placeholder'
  | 'name'
  | 'id'
  | 'aria-label'
  | 'aria-labelledby'
>;

export type SelectProps = {
  // base

  /** Значение селекта */
  value?: SelectValue;

  /** Опции селекта */
  options?: SelectOptionType[];

  /** Можно ли выбирать несколько значений */
  multiple?: boolean;

  /** Можно ли производить фильтрацию опций через поиск */
  allowSearch?: boolean;

  /** Фильтровать ли опции при изменении onSearch */
  filterOptions?: boolean;

  /** Виртуализировать ли список опций */
  virtualize?: boolean;

  /** Состояние загрузки */
  loading?: boolean;

  /** Закрывать ли список после выбора опции (при multiple = false) */
  closeAfterSelect?: boolean;

  /** Будет ли происходить событие onSearch с пустым значением при потере фокуса у инпута */
  clearSearchValueSearchBlur?: boolean;

  /** Значение searchValue */
  searchValue?: string;

  // handlers
  /** Обработчик события при открытии */
  onOpen?: () => void;
  /** Обработчик события при закрытии */
  onClose?: () => void;
  /** Обработчик события при выборе опции */
  onSelect?: (value: SelectSingleValue) => void;
  /** Обработчик события при повторном нажатии на выбранную опцию */
  onDeselect?: (value: SelectSingleValue) => void;
  /** Обработчик события при изменении состояния */
  onChange?: SelectChangeHandler;
  /** Обработчик события при отчистке значения */
  onClear?: () => void;
  /** Обработчик при изменении поиска */
  onSearch?: (searchValue: string) => void;

  // styles
  /** Скрывать ли слишком длинный текст для label и hint */
  optionsWrap?: SelectOptionsWrap;

  className?: string;
  style?: CSSProperties;

  /**
   * Идентификатор для систем автоматизированного тестирования
   */
  dataTestId?: string;
} & InheritedInputProps;
