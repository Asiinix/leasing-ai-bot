import { SelectOptionWrapType, SelectProps, SelectSingleValue } from '../../Select.type';
import { SelectOptionType } from '../SelectOption';

export type SelectDropdownMenuProps = {
  id?: string;
  activeIndex?: number;
  multiple?: boolean;
  options: SelectOptionType[];
  labelWrap: SelectOptionWrapType;
  hintWrap: SelectOptionWrapType;
  value: SelectProps['value'];

  loading?: boolean;
  virtualize?: boolean;
  onChange?: (selectedValue: SelectSingleValue) => void;
  onSelect?: (selectedValue: SelectSingleValue) => void;
  onDeselect?: (selectedValue: SelectSingleValue) => void;
};
