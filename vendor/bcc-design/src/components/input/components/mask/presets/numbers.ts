import type { MaskitoOptions } from '@maskito/core';
import type { ElementState } from '@maskito/core';
import {
  maskitoAddOnFocusPlugin,
  maskitoCaretGuard,
  maskitoPostfixPostprocessorGenerator,
  maskitoPrefixPostprocessorGenerator,
  maskitoRemoveOnBlurPlugin,
  maskitoWithPlaceholder,
} from '@maskito/kit';

import type { NumbersMaskProps } from '../InputMask.type';

export const getNumbersPreset = ({ prefix = '', postfix = '', placeholder = '', mode = 'shift' }: NumbersMaskProps) => {
  const placeholderOptions = maskitoWithPlaceholder(placeholder, true);

  const numbers: MaskitoOptions = {
    mask: ({ value }) => {
      const digitsMask = Array.from(value.replaceAll(postfix, '')).map(() => /\d/);

      if (!digitsMask.length) {
        return [/\d/];
      }

      return constructMask(prefix, digitsMask, postfix);
    },
    preprocessors: [...placeholderOptions.preprocessors],
    postprocessors: [
      maskitoPrefixPostprocessorGenerator(prefix),
      maskitoPostfixPostprocessorGenerator(postfix),
      removeRedundantLeadingZeros,
      ...placeholderOptions.postprocessors,
    ],
    plugins: [
      maskitoAddOnFocusPlugin(prefix + postfix),
      maskitoRemoveOnBlurPlugin(prefix + postfix),
      maskitoCaretGuard((value, [from, to]) => [from === to ? prefix.length : 0, value.length]),
      ...placeholderOptions.plugins,
    ],
    overwriteMode: mode,
  };

  return numbers;
};

function constructMask(prefix: string, digitsMask: (RegExp | string)[], postfix: string) {
  if (prefix && postfix) {
    return [prefix, ...digitsMask, postfix];
  } else if (prefix) {
    return [prefix, ...digitsMask];
  } else if (postfix) {
    return [...digitsMask, postfix];
  } else {
    return [...digitsMask];
  }
}

const removeRedundantLeadingZeros = ({ value, selection }: ElementState, _: ElementState): ElementState => {
  const [from, to] = selection;
  const noRepeatedLeadingZeroesValue = value.replace(/^0+/, '0');
  const removedCharacters = value.length - noRepeatedLeadingZeroesValue.length;

  return {
    value: noRepeatedLeadingZeroesValue, // User types "000000" => 0|
    selection: [Math.max(from - removedCharacters, 0), Math.max(to - removedCharacters, 0)],
  };
};
