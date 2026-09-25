import React, { forwardRef } from 'react';
import { block } from '../../../../utilities/cn';

import { SelectOptionProps } from './SelectOption.type';

import './SelectOption.scss';

const b = block('select-option');

export const SelectOption = forwardRef<HTMLDivElement, SelectOptionProps>(
  ({ id, isActive, isSelected, labelWrap, hintWrap, onChange, style, dataIndex, ...option }, ref) => {
    const { label, value, hint, disabled, addonLeft, addonRight } = option;

    return (
      <div
        ref={ref}
        id={id}
        data-index={dataIndex}
        role="option"
        aria-label={label}
        aria-selected={`${isSelected}`}
        aria-disabled={disabled || undefined}
        className={b({ selected: isSelected, active: isActive, disabled })}
        onMouseDown={event => event.preventDefault()}
        onClick={disabled ? undefined : () => onChange?.(value)}
        style={style}
      >
        <div className={b('addon')}>{addonLeft}</div>

        <div className={b('optionWrapper')}>
          <div className={b('label', { [labelWrap]: true })} title={label}>
            {label}
          </div>
          <div className={b('hint', { [hintWrap]: true })} title={hint}>
            {hint}
          </div>
        </div>

        <div className={b('addon')}>{addonRight}</div>
      </div>
    );
  },
);
