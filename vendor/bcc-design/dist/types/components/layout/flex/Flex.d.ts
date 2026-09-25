import React from 'react';
import { FlexPropsWithTypedAttrs, FlexRef } from './Flex.type';
import './Flex.scss';
export declare const Flex: (<C extends React.ElementType = "div">(props: FlexPropsWithTypedAttrs<C> & {
    ref?: FlexRef<C>;
}) => React.ReactElement) & {
    displayName: string;
};
