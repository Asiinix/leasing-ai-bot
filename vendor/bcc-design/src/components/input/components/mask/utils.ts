import { MaskitoOptions } from '@maskito/core';
import { Writable } from 'utility-types';

import { InputMaskOptions, InputMaskProps, PresetMaskProps } from './InputMask.type';
import { setCustomOptions } from './option-getters/setCustomOptions';
import { setPresetOptions } from './option-getters/setPresetOptions';

const defaultMaskitoOptions: MaskitoOptions = {
  mask: /.*/,
  preprocessors: [],
  postprocessors: [],
  plugins: [],
  overwriteMode: 'shift',
};

/**
 * Парсит MaskProps и возвращает соответсвующее опции для маски.
 * */
export const propsToOptions = (props: InputMaskProps | undefined): MaskitoOptions => {
  if (!props) return defaultMaskitoOptions;

  const options = structuredClone(defaultMaskitoOptions);

  if (isValidInputMaskOption(props)) {
    setPresetOptions(props, options);
  } else {
    setCustomOptions(props, options);
  }

  return options;
};

/**
 * Функция для определения является ли запрашиваемая маска пресетом.
 * */
const INPUT_MASK_OPTIONS_ARRAY: InputMaskOptions[] = [
  'phone',
  'numbers',
  'date',
  'dateTime',
  'card',
  'account',
  'amount',
];
function isValidInputMaskOption(props: InputMaskProps): props is PresetMaskProps {
  return INPUT_MASK_OPTIONS_ARRAY.includes(props?.value as InputMaskOptions);
}

/**
 * Сливает опции для маски в тип MaskitoOptions.
 * Note: мутирует объект.
 * */
type WritableMaskitoOptions = Writable<MaskitoOptions>;
export const mergeMaskOptions = (opt1: WritableMaskitoOptions, opt2: WritableMaskitoOptions): void => {
  opt1.mask = opt2.mask;
  opt1.preprocessors = [...(opt1.preprocessors || []), ...(opt2.preprocessors || [])];
  opt1.postprocessors = [...(opt1.postprocessors || []), ...(opt2.postprocessors || [])];
  opt1.plugins = [...(opt1.plugins || []), ...(opt2.plugins || [])];
  opt1.overwriteMode = opt2.overwriteMode;
};
