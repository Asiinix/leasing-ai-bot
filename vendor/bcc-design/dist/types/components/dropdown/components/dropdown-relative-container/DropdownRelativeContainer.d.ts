import React, { CSSProperties } from 'react';
import './DropdownRelativeContainer.scss';
type Props = {
    children?: React.ReactNode;
    withRelativeContainer?: boolean;
    className: string;
    style: CSSProperties;
};
export declare const DropdownRelativeContainer: React.MemoExoticComponent<({ children, withRelativeContainer, className, style }: Props) => string | number | bigint | boolean | Iterable<React.ReactNode> | Promise<string | number | bigint | boolean | React.ReactPortal | React.ReactElement<unknown, string | React.JSXElementConstructor<any>> | Iterable<React.ReactNode> | null | undefined> | React.JSX.Element | null | undefined>;
export {};
