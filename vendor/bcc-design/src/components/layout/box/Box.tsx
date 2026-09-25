import React from 'react';
import { block } from '../../../utilities/cn';

import { generateSpacingStyles } from '../layout-config/spacing';
import { BoxProps, BoxPropsWithTypedAttrs, BoxRef } from './Box.type';

import './Box.scss';

const b = block('box');

export const Box = React.forwardRef(function Box<T extends React.ElementType = 'div'>(
  {
    as,
    children,
    className = '',
    width,
    height,
    minWidth,
    minHeight,
    maxHeight,
    maxWidth,
    style: outerStyle,
    spacing,
    overflow,
    dataTestId,
    ...props
  }: BoxProps<T>,
  ref?: BoxRef<T>,
) {
  const Component: React.ElementType = as || 'div';

  const style: React.CSSProperties = {
    width,
    height,
    minWidth,
    minHeight,
    maxHeight,
    maxWidth,
    ...generateSpacingStyles(spacing),
    ...outerStyle,
  };

  return (
    <Component {...props} data-test-id={dataTestId} style={style} ref={ref} className={b({ overflow }, className)}>
      {children}
    </Component>
  );
}) as (<C extends React.ElementType = 'div'>(
  props: BoxPropsWithTypedAttrs<C> & { ref?: BoxRef<C> },
) => React.ReactElement) & { displayName: string };
