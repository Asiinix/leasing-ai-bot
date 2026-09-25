import { CSSProperties, ReactNode } from 'react';

import { SelectOptionWrapType, SelectSingleValue } from '../../Select.type';

export type SelectOptionType = {
  label: string;
  value: string | number;
  hint?: string;
  disabled?: boolean;
  addonLeft?: ReactNode;
  addonRight?: ReactNode;
};

export type SelectOptionProps = SelectOptionType & {
  id?: string;
  isActive?: boolean;
  labelWrap: SelectOptionWrapType;
  hintWrap: SelectOptionWrapType;
  isSelected: boolean;
  onChange?: (selectedValue: SelectSingleValue) => void;
  style?: CSSProperties;

  // для виртуализации
  dataIndex?: number;
};
