import React from 'react';
import { BaseInputProps } from '../base-input';
import './InputPassword.scss';
export type InputPasswordProps = Omit<BaseInputProps, 'FormControlComponent' | 'mask' | 'type'>;
export declare const InputPassword: React.NamedExoticComponent<InputPasswordProps & React.RefAttributes<HTMLInputElement>>;
