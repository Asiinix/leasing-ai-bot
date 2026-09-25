import { MaskitoDateMode, MaskitoTimeMode } from '@maskito/kit';
export type InputMaskOptions = 'account' | 'amount' | 'card' | 'numbers' | 'phone' | 'date' | 'dateTime';
export type InputMaskProps = CustomMaskProps | PresetMaskProps;
export type PresetMaskProps = AccountMaskProps | AmountMaskProps | CardMaskProps | NumbersMaskProps | PhoneMaskProps | DateMaskProps | DateTimeMaskProps;
export type CustomMaskProps = {
    value?: RegExp;
    postfix?: string;
    prefix?: string;
    placeholder?: string;
    mode?: 'replace' | 'shift';
};
export type AccountMaskProps = {
    value: 'account';
    placeholder?: boolean;
    mode?: 'replace' | 'shift';
};
export type AmountMaskProps = {
    value: 'amount';
    prefix?: string;
    postfix?: string;
    precision?: number;
    mode?: 'replace' | 'shift';
};
export type CardMaskProps = {
    value: 'card';
    placeholder?: boolean;
    mode?: 'replace' | 'shift';
};
export type NumbersMaskProps = {
    value: 'numbers';
    prefix?: string;
    postfix?: string;
    placeholder?: string;
    mode?: 'replace' | 'shift';
};
export type PhoneMaskProps = {
    value: 'phone';
    placeholder?: boolean;
    mode?: 'replace' | 'shift';
};
export type DateMaskProps = {
    value: 'date';
    placeholder?: boolean;
    dateMode?: MaskitoDateMode;
    separator?: string;
    min?: Date;
    max?: Date;
};
export type DateTimeMaskProps = {
    value: 'dateTime';
    placeholder?: boolean;
    dateMode?: MaskitoDateMode;
    timeMode?: MaskitoTimeMode;
    separator?: string;
    min?: Date;
    max?: Date;
};
