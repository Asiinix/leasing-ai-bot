import type { BaseInputProps } from './components/base-input';
export type InputProps = Omit<BaseInputProps, 'FormControlComponent'>;
export declare const Input: import("react").NamedExoticComponent<InputProps & import("react").RefAttributes<HTMLInputElement>>;
