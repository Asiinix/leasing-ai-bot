import React, { forwardRef, memo, useCallback, useState } from 'react';
import { block } from '../../../../utilities/cn';

import { FormControl } from '../../../form-control';
import { BaseInput, BaseInputProps } from '../base-input';
import { EyeCrossedIcon } from '../icons/EyeCrossedIcon';
import { EyeIcon } from '../icons/EyeIcon';

import './InputPassword.scss';

const b = block('input-password');

export type InputPasswordProps = Omit<BaseInputProps, 'FormControlComponent' | 'mask' | 'type'>;
export const InputPassword = memo(
  forwardRef<HTMLInputElement, InputPasswordProps>((props, ref) => {
    const [shown, setShown] = useState(false);
    const toggleShown = useCallback((e: React.MouseEvent<HTMLButtonElement>) => {
      e.stopPropagation();
      setShown(prev => !prev);
    }, []);

    const EyeIconButton = () => {
      return (
        <button type="button" onClick={toggleShown} className={b('icon')}>
          {shown ? <EyeCrossedIcon /> : <EyeIcon />}
        </button>
      );
    };

    return (
      <BaseInput
        {...props}
        ref={ref}
        type={shown ? 'text' : 'password'}
        FormControlComponent={FormControl}
        rightAddon={EyeIconButton()}
      />
    );
  }),
);
