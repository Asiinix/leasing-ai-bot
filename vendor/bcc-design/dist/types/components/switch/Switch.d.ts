import { ChangeEvent } from 'react';
import './Switch.scss';
export declare const Switch: import("react").ForwardRefExoticComponent<Omit<import("react").InputHTMLAttributes<HTMLInputElement>, "onChange" | "size"> & Omit<import("../toggle-control").ToggleControlProps, "Control"> & {
    size?: "sm" | "md";
    checked?: boolean;
    onChange?: (event: ChangeEvent<HTMLInputElement>, payload: import("./Switch.type").SwitchValuePayload) => void;
    disabled?: boolean;
} & import("react").RefAttributes<HTMLInputElement>>;
