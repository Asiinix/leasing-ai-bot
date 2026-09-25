import { ReactNode } from 'react';
import { DropdownProps } from '../../Dropdown.type';
type DropdownPortalProps = Pick<DropdownProps, 'usePortal' | 'portalContainer'> & {
    children?: ReactNode;
};
export declare const DropdownPortal: import("react").MemoExoticComponent<({ children, usePortal, portalContainer }: DropdownPortalProps) => ReactNode>;
export {};
