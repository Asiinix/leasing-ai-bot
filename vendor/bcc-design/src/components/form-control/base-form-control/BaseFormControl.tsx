import React from 'react';
import { block } from '../../../utilities/cn';

import type { BaseFormControlProps } from './BaseFormControl.type';

import './BaseFormControl.scss';

const b = block('form-control');

export const BaseFormControl = React.forwardRef<HTMLDivElement, BaseFormControlProps>(
  (
    {
      // inputContainer props
      fullWidth = false,
      filled,
      disabled,
      focused,
      error,
      labelType = 'outer',
      label,
      hint,
      leftAddon = null,
      rightAddon = null,
      children,
      onClick,
      onMouseDown,
      onMouseUp,

      // wrapper rest props
      ...wrapperRestProps
    },
    ref,
  ) => {
    const outerLabel = Boolean(label && labelType === 'outer');
    const innerLabel = Boolean(label && labelType === 'inner');
    const active = Boolean(innerLabel && (filled || focused));

    return (
      <div className={b({ fullWidth, disabled })} {...wrapperRestProps}>
        <span className={b('label', { outerLabel })}>{label}</span>

        <div
          ref={ref}
          className={b('inputContainer', { focused, disabled, error: Boolean(error) })}
          onClick={onClick}
          onMouseDown={onMouseDown}
          onMouseUp={onMouseUp}
        >
          <div className={b('addon')}>{leftAddon}</div>

          <div className={b('inputRoot', { outerLabel, innerLabel })}>
            <span className={b('label', { innerLabel, active, disabled })}>{label}</span>
            <div className={b('input', { innerLabel, active })}>{children}</div>
          </div>

          <div className={b('addon')}>{rightAddon}</div>
        </div>
        <div className={b('caption', { error: Boolean(error), active: Boolean(error || hint) })}>
          {error || hint}&nbsp;
        </div>
      </div>
    );
  },
);
