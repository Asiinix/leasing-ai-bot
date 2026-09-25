'use client';

import { forwardRef } from 'react';

import { ButtonProps } from './Button.type';
import { BaseButton } from './component/base-buttton';

export const Button = forwardRef<HTMLAnchorElement | HTMLButtonElement, ButtonProps>(
  ({ children, ...restProps }, ref) => {
    const Component = BaseButton;

    return (
      <Component ref={ref} {...restProps}>
        {children}
      </Component>
    );
  },
);
