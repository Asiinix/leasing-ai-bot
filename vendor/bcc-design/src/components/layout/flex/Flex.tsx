import React from 'react';
import { block } from '../../../utilities/cn';

import { Box } from '../box';
import { useLayoutContext } from '../layout-config/LayoutContext';
import type { MediaPartial } from '../layout-config/LayoutContext.type';
import { FlexProps, FlexPropsWithTypedAttrs, FlexRef } from './Flex.type';

import './Flex.scss';

const b = block('flex');

export const Flex = React.forwardRef(function Flex<T extends React.ElementType = 'div'>(
  props: FlexProps<T>,
  ref: FlexRef<T>,
) {
  const {
    as: propsAs,
    className = '',
    direction,
    grow,
    basis,
    children,
    style,
    alignContent,
    alignItems,
    alignSelf,
    justifyContent,
    justifyItems,
    justifySelf,
    shrink,
    wrap,
    inline,
    gap,
    centerContent,
    dataTestId,
    ...restProps
  } = props;

  const as: React.ElementType = propsAs || 'div';

  const { getClosestMediaProps } = useLayoutContext();

  const applyMediaProps = <P,>(
    property?: P | MediaPartial<P extends MediaPartial<infer V> ? V : P>,
  ): P | (P extends MediaPartial<infer V> ? V : P) | undefined =>
    typeof property === 'object' && property !== null ? getClosestMediaProps(property) : property;

  return (
    <Box
      {...restProps}
      as={as}
      className={b({ 'center-content': centerContent, inline }, className)}
      ref={ref}
      style={{
        flexDirection: applyMediaProps(direction),
        flexGrow: grow === true ? 1 : grow,
        flexWrap: wrap === true ? 'wrap' : wrap,
        flexBasis: basis,
        flexShrink: shrink,
        gap: applyMediaProps(gap),
        alignContent: applyMediaProps(alignContent),
        alignItems: applyMediaProps(alignItems),
        alignSelf: applyMediaProps(alignSelf),
        justifyContent: applyMediaProps(justifyContent),
        justifyItems: applyMediaProps(justifyItems),
        justifySelf: applyMediaProps(justifySelf),
        ...style,
      }}
      data-test-id={dataTestId}
    >
      {children}
    </Box>
  );
}) as (<C extends React.ElementType = 'div'>(
  props: FlexPropsWithTypedAttrs<C> & { ref?: FlexRef<C> },
) => React.ReactElement) & { displayName: string };
