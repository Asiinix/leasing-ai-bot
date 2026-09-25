import type { MaskitoOptions } from '@maskito/core';
import {
  maskitoAddOnFocusPlugin,
  maskitoCaretGuard,
  maskitoRemoveOnBlurPlugin,
  maskitoWithPlaceholder,
} from '@maskito/kit';

import { AccountMaskProps } from '../InputMask.type';

const PLACEHOLDER = 'KZ __ ____ ____ ____ ____' as const;

export const getAccountPreset = (props: AccountMaskProps) => {
  const placeholderOptions = maskitoWithPlaceholder(props?.placeholder ? PLACEHOLDER : '', true);

  const account = {
    mask: [
      'K',
      'Z',
      ' ',
      ...new Array(2).fill(/\d/),
      ' ',
      ...new Array(4).fill(/\d/),
      ' ',
      ...new Array(4).fill(/\d/),
      ' ',
      ...new Array(4).fill(/\d/),
      ' ',
      ...new Array(4).fill(/\d/),
    ],

    postprocessors: [...placeholderOptions.postprocessors],
    preprocessors: [...placeholderOptions.preprocessors],
    plugins: [
      maskitoAddOnFocusPlugin('KZ '),
      maskitoRemoveOnBlurPlugin('KZ '),
      ...placeholderOptions.plugins,
      maskitoCaretGuard((value, [from, to]) => [from === to ? 'KZ '.length : 0, value.length]),
    ],
    overwriteMode: props?.mode,
  } as MaskitoOptions;

  return account;
};
