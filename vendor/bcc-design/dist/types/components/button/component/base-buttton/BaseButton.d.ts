import React from 'react';
import { CommonButtonProps } from '../../Button.type';
import './BaseButton.scss';
export type ContainerElement = HTMLButtonElement | HTMLAnchorElement;
export declare const BaseButton: React.ForwardRefExoticComponent<CommonButtonProps & React.RefAttributes<HTMLAnchorElement | HTMLButtonElement>>;
