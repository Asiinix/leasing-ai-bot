import './SegmentControl.scss';
export declare const SegmentControl: import("react").ForwardRefExoticComponent<Omit<import("./SegmentControl.type").NativeProps, "onChange"> & {
    selectedId?: number;
    items?: {
        id: number;
        label: string;
        disabled?: boolean;
    }[];
    shape?: "rounded" | "rectangular";
    size?: "xs" | "sm" | "md" | "lg";
    children?: React.ReactNode;
    childrenRef?: import("react").LegacyRef<HTMLSpanElement> | undefined;
    styles?: {
        [key: string]: string;
    };
    onChange?: (id: number) => void;
    dataTestId?: string;
} & import("react").RefAttributes<HTMLUListElement>>;
