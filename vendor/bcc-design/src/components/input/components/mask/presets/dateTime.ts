import type { MaskitoOptions } from '@maskito/core';
import { maskitoDateTimeOptionsGenerator, maskitoWithPlaceholder } from '@maskito/kit';

import { DateTimeMaskProps } from '../InputMask.type';

export const getDateTimePreset = ({
  dateMode = 'dd/mm/yyyy',
  timeMode = 'HH:MM',
  separator = '.',
  ...props
}: DateTimeMaskProps) => {
  const placeholder = props?.placeholder ? dateMode?.concat(`, ${timeMode}`).replaceAll('/', separator) : '';

  const placeholderOptions = maskitoWithPlaceholder(placeholder, true);

  const dateTimeOptions = maskitoDateTimeOptionsGenerator({
    dateMode,
    timeMode,
    dateSeparator: separator,
    min: props?.min,
    max: props?.max,
  });

  const dateTime = {
    ...dateTimeOptions,
    plugins: placeholderOptions.plugins.concat(dateTimeOptions.plugins || []),
    preprocessors: [...placeholderOptions.preprocessors, ...dateTimeOptions.preprocessors],
    postprocessors: [...dateTimeOptions.postprocessors, ...placeholderOptions.postprocessors],
  } as MaskitoOptions;

  return dateTime;
};
