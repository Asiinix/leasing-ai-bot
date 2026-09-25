import { MaskitoOptions } from '@maskito/core';

import { CustomMaskProps } from '../InputMask.type';
import { getCustomPreset } from '../presets/custom';
import { mergeMaskOptions } from '../utils';

export const setCustomOptions = (props: CustomMaskProps, options: MaskitoOptions) => {
  const custom = getCustomPreset(props);
  mergeMaskOptions(options, custom);
};
