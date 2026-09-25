import { MaskitoOptions } from '@maskito/core';
import { maskitoNumberOptionsGenerator } from '@maskito/kit';

import { AmountMaskProps } from '../InputMask.type';

export const getAmountPreset = (props: AmountMaskProps) => {
  const amount = maskitoNumberOptionsGenerator({
    decimalSeparator: ' ,',
    thousandSeparator: ' ',
    decimalPseudoSeparators: ['.', 'ю', 'б'],
    precision: props?.precision || 2,
    prefix: props?.prefix,
    postfix: props?.postfix,
  }) as MaskitoOptions;

  return {
    ...amount,
    overwriteMode: props?.mode,
  };
};
