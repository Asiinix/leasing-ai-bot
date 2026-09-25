import { MaskitoOptions } from '@maskito/core';
import {
  maskitoAddOnFocusPlugin,
  maskitoCaretGuard,
  maskitoPostfixPostprocessorGenerator,
  maskitoPrefixPostprocessorGenerator,
  maskitoRemoveOnBlurPlugin,
  maskitoWithPlaceholder,
} from '@maskito/kit';

import { CustomMaskProps } from '../InputMask.type';

export const getCustomPreset = ({
  value = /.*/,
  prefix = '',
  postfix = '',
  placeholder = '',
  mode = 'shift',
}: CustomMaskProps) => {
  const placeholderOptions = maskitoWithPlaceholder(placeholder);

  const custom: MaskitoOptions = {
    mask: value,
    preprocessors: [...placeholderOptions.preprocessors],
    postprocessors: [
      maskitoPostfixPostprocessorGenerator(postfix),
      maskitoPrefixPostprocessorGenerator(prefix),
      ...placeholderOptions.postprocessors,
    ],
    plugins: [
      ...placeholderOptions.plugins,
      maskitoAddOnFocusPlugin(prefix + postfix),
      maskitoRemoveOnBlurPlugin(prefix + postfix),
      maskitoCaretGuard(value => [prefix.length, value.length - postfix.length]),
    ],
    overwriteMode: mode,
  };

  return custom;
};
