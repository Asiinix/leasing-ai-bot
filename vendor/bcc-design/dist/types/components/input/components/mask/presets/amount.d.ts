import { AmountMaskProps } from '../InputMask.type';
export declare const getAmountPreset: (props: AmountMaskProps) => {
    overwriteMode: "shift" | "replace" | undefined;
    mask: import("@maskito/core").MaskitoMask;
    preprocessors?: readonly import("@maskito/core").MaskitoPreprocessor[];
    postprocessors?: readonly import("@maskito/core").MaskitoPostprocessor[];
    plugins?: readonly import("@maskito/core").MaskitoPlugin[];
};
