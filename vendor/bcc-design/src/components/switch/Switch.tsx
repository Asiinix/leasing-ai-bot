'use client';

import { ChangeEvent, forwardRef, useRef } from 'react';
import { ToggleControl } from '../toggle-control/ToggleControl';
import { useFocus } from '../../hooks/useFocus';
import { block } from '../../utilities/cn';

import { SwitchProps } from './Switch.type';

import './Switch.scss';

const b = block('switch');

export const Switch = forwardRef<HTMLInputElement, SwitchProps>(
  (
    {
      // input props
      checked,
      onChange,
      disabled,
      size = 'md',

      // ToggleControl props
      label,
      hint,
      align,
      justify,
      reversed,
      error,
      labelProps,
      fullWidth,
      dataTestId,

      // rest of input props
      name,
      style,
      className,
      ...rest
    },
    ref,
  ) => {
    const labelRef = useRef<HTMLLabelElement>(null);
    const [focused] = useFocus(labelRef, 'keyboard');

    const handleChange = (e: ChangeEvent<HTMLInputElement>) => {
      onChange?.(e, { checked: e.target.checked, name: e.target.name });
    };

    return (
      <ToggleControl
        labelProps={{ style, ...labelProps }}
        ref={labelRef}
        label={label}
        hint={hint}
        align={align}
        justify={justify}
        reversed={reversed}
        error={error}
        fullWidth={fullWidth}
        disabled={disabled}
        dataTestId={dataTestId}
        className={className}
        Control={
          <>
            <input
              {...rest}
              ref={ref}
              name={name}
              type="checkbox"
              onChange={handleChange}
              checked={checked}
              disabled={disabled}
              aria-disabled={disabled}
            />

            <span
              className={b('box', {
                checked,
                disabled,
                focused,
                error: Boolean(error),
                [size]: true,
              })}
            />
          </>
        }
      />
    );
  },
);
