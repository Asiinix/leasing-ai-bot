import React from 'react';
import './SelectOption.scss';
export declare const SelectOption: React.ForwardRefExoticComponent<import("./SelectOption.type").SelectOptionType & {
    id?: string;
    isActive?: boolean;
    labelWrap: import("../..").SelectOptionWrapType;
    hintWrap: import("../..").SelectOptionWrapType;
    isSelected: boolean;
    onChange?: (selectedValue: import("../..").SelectSingleValue) => void;
    style?: React.CSSProperties;
    dataIndex?: number;
} & React.RefAttributes<HTMLDivElement>>;
