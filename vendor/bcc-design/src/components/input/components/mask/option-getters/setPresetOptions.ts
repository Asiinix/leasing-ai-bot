import { MaskitoOptions } from '@maskito/core';

import {
  AccountMaskProps,
  AmountMaskProps,
  CardMaskProps,
  DateMaskProps,
  DateTimeMaskProps,
  InputMaskOptions,
  NumbersMaskProps,
  PhoneMaskProps,
  PresetMaskProps,
} from '../InputMask.type';
import { getAccountPreset } from '../presets/account';
import { getAmountPreset } from '../presets/amount';
import { getCardPreset } from '../presets/card';
import { getDatePreset } from '../presets/date';
import { getDateTimePreset } from '../presets/dateTime';
import { getNumbersPreset } from '../presets/numbers';
import { getPhonePreset } from '../presets/phone';
import { mergeMaskOptions } from '../utils';

export const setPresetOptions = (props: PresetMaskProps, options: MaskitoOptions): void => {
  const presets = getMaskPresetMap(props);
  mergeMaskOptions(options, presets[props.value] as MaskitoOptions);
};

type MaskPresetOptionsMap = { [K in InputMaskOptions]?: MaskitoOptions };
function getMaskPresetMap(props?: PresetMaskProps): MaskPresetOptionsMap {
  const MaskPresetOptions: MaskPresetOptionsMap = {
    account: getAccountPreset(props as AccountMaskProps),
    amount: getAmountPreset(props as AmountMaskProps),
    card: getCardPreset(props as CardMaskProps),
    date: getDatePreset(props as DateMaskProps),
    dateTime: getDateTimePreset(props as DateTimeMaskProps),
    numbers: getNumbersPreset(props as NumbersMaskProps),
    phone: getPhonePreset(props as PhoneMaskProps),
  };

  return MaskPresetOptions;
}
