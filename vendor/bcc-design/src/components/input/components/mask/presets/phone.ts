import { maskitoUpdateElement, type MaskitoOptions, type MaskitoPreprocessor } from '@maskito/core';
import {
  maskitoCaretGuard,
  maskitoEventHandler,
  maskitoPrefixPostprocessorGenerator,
  maskitoWithPlaceholder,
} from '@maskito/kit';

import { PhoneMaskProps } from '../InputMask.type';

const PLACEHOLDER = '+  (   ) ___-__-__';
const COUTRY_CODE = '7';

export const getPhonePreset = (props: PhoneMaskProps) => {
  const placeholder = props?.placeholder ? PLACEHOLDER : '';

  const { removePlaceholder, plugins, ...placeholderOptions } = maskitoWithPlaceholder(placeholder);

  const phone = {
    mask: ['+', COUTRY_CODE, ' ', '(', /\d/, /\d/, /\d/, ')', ' ', /\d/, /\d/, /\d/, '-', /\d/, /\d/, '-', /\d/, /\d/],
    preprocessors: [...placeholderOptions.preprocessors, createCompletePhoneInsertionPreprocessor()],
    postprocessors: [maskitoPrefixPostprocessorGenerator('+7'), ...placeholderOptions.postprocessors],
    plugins: [
      ...plugins,
      maskitoEventHandler('focus', element => {
        const initialValue = element.value || `+${COUTRY_CODE} (`;

        maskitoUpdateElement(element, initialValue + PLACEHOLDER.slice(initialValue.length));
      }),
      maskitoEventHandler('blur', element => {
        const cleanValue = removePlaceholder(element.value);

        maskitoUpdateElement(element, cleanValue === `+${COUTRY_CODE}` ? '' : cleanValue);
      }),
      maskitoCaretGuard((value, [from, to]) => [from === to ? `+${COUTRY_CODE} `.length : 0, value.length]),
    ],
    overwriteMode: props?.mode,
  } as MaskitoOptions;

  return phone;
};

// Paste "89123456789" => "+7 (912) 345-67-89"
function createCompletePhoneInsertionPreprocessor(): MaskitoPreprocessor {
  const trimPrefix = (value: string): string => value.replace(/^(\+?7?\s?8?)\s?/, '');
  //@ts-ignore
  const countDigits = (value: string): number => value.replaceAll(/\D/g, '').length;

  return ({ elementState, data }) => {
    const { value, selection } = elementState;

    return {
      elementState: {
        selection,
        value: countDigits(value) > 11 ? trimPrefix(value) : value,
      },
      data: countDigits(data) >= 11 ? trimPrefix(data) : data,
    };
  };
}
