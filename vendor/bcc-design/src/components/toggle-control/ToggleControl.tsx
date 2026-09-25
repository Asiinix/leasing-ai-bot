'use client';

import { forwardRef } from 'react';
import { block } from '../../utilities/cn';

import { ToggleControlProps } from './ToggleControl.type';

import './ToggleControl.scss';

const b = block('toggle-control');

export const ToggleControl = forwardRef<HTMLLabelElement, ToggleControlProps>(
  (
    {
      label,
      hint,
      align = 'center',
      justify = 'start',
      reversed,
      error,
      disabled,
      fullWidth,
      dataTestId,
      Control,
      labelProps,
      className,
    },
    ref,
  ) => {
    return (
      <label
        {...labelProps}
        data-test-id={dataTestId}
        ref={ref}
        className={b({ reversed, fullWidth, disabled, input: true }, className)}
      >
        <div className={b('inputWrapper', { [align]: true })}>{Control}</div>

        <div className={b('text', { [justify]: true })}>
          <div className={b('title')}>{label}</div>
          <div className={b('hint')}>{hint}</div>
          <div className={b('error', { active: Boolean(error) })}>{error}&nbsp;</div>
        </div>
      </label>
    );
  },
);
