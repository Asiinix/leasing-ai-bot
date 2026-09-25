import type { MaskitoOptions } from '@maskito/core';
import { maskitoDateOptionsGenerator, maskitoWithPlaceholder } from '@maskito/kit';

import { DateMaskProps } from '../InputMask.type';

export const getDatePreset = ({ dateMode = 'dd/mm/yyyy', separator = '.', ...props }: DateMaskProps) => {
  const placeholder = props?.placeholder ? dateMode.replaceAll('/', separator) : '';

  const placeholderOptions = maskitoWithPlaceholder(placeholder, true);

  const dateOptions = maskitoDateOptionsGenerator({
    mode: dateMode,
    separator: separator,
    min: props?.min,
    max: props?.max,
  });

  const date = {
    ...dateOptions,
    plugins: placeholderOptions.plugins.concat(dateOptions.plugins || []),
    preprocessors: [...placeholderOptions.preprocessors, ...dateOptions.preprocessors],
    postprocessors: [...dateOptions.postprocessors, ...placeholderOptions.postprocessors],
  } as MaskitoOptions;

  return date;
};
