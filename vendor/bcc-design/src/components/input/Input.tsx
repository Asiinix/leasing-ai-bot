'use client';

import { forwardRef, memo, useMemo } from 'react';
import { FormControl } from '../form-control/index';
import { useMaskito } from '@maskito/react';
import { mergeRefs } from '../../utilities/mergeRefs';

import { BaseInput } from './components/base-input';
import type { BaseInputProps } from './components/base-input';
import { InputPassword } from './components/input-password';
import { propsToOptions } from './components/mask/utils';

export type InputProps = Omit<BaseInputProps, 'FormControlComponent'>;

export const Input = memo(
  forwardRef<HTMLInputElement, InputProps>(({ mask, type, ...props }, ref) => {
    const withMask = Boolean(mask?.value);
    const isPassword = type === 'password';

    if (withMask) return <MaskedInput {...props} mask={mask} />;
    if (isPassword) return <InputPassword {...props} />;

    return <BaseInput {...props} ref={ref} FormControlComponent={FormControl} />;
  }),
);

const MaskedInput = memo(
  forwardRef<HTMLInputElement, InputProps>(({ mask, ...props }, ref) => {
    const maskOptions = useMemo(() => propsToOptions(mask), [mask?.value]);

    const inputRef = useMaskito({ options: maskOptions });
    const mergedRef = mergeRefs([ref, inputRef]);

    return <BaseInput {...props} ref={mergedRef} FormControlComponent={FormControl} />;
  }),
);
