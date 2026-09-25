import type { MaskitoOptions } from '@maskito/core';
import { maskitoWithPlaceholder } from '@maskito/kit';

import { CardMaskProps } from '../InputMask.type';

const PLACEHOLDER = '____ ____ ____ ____' as const;
export const getCardPreset = (props: CardMaskProps) => {
  const placeholderOptions = maskitoWithPlaceholder(props?.placeholder ? PLACEHOLDER : '', true);

  const card = {
    ...placeholderOptions,
    mask: [
      ...new Array(4).fill(/\d/),
      ' ',
      ...new Array(4).fill(/\d/),
      ' ',
      ...new Array(4).fill(/\d/),
      ' ',
      ...new Array(4).fill(/\d/),
    ],
    overwriteMode: props?.mode,
  } as MaskitoOptions;

  return card;
};
