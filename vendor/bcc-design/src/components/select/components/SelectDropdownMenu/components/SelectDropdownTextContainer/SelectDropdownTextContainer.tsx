import React from 'react';
import { block } from '../../../../../../utilities/cn';

import './SelectDropdownTextContainer.scss';

const b = block('select-dropdown-text-container');

type Props = {
  text?: string;
  justify?: 'start' | 'center' | 'end';
};
export const SelectDropdownTextContainer = ({ text, justify = 'start' }: Props) => {
  return <div className={b({ justify })}>{text}</div>;
};
