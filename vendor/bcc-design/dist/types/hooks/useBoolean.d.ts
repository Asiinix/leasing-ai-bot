type UseBooleanReturnValue = {
    value: boolean;
    setValue: (value: boolean) => void;
    toggle: () => void;
    setTrue: () => void;
    setFalse: () => void;
};
type UseBooleanOptions = {
    onTrue?: () => void;
    onFalse?: () => void;
    onToggle?: (value: boolean) => void;
};
export declare function useBoolean(init: boolean, options?: UseBooleanOptions): UseBooleanReturnValue;
export {};
