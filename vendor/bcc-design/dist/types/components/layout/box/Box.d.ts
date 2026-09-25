import React from 'react';
import { BoxPropsWithTypedAttrs, BoxRef } from './Box.type';
import './Box.scss';
export declare const Box: (<C extends React.ElementType = "div">(props: BoxPropsWithTypedAttrs<C> & {
    ref?: BoxRef<C>;
}) => React.ReactElement) & {
    displayName: string;
};
