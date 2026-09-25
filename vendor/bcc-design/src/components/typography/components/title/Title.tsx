import React, { forwardRef, HTMLAttributes } from 'react';
import { mergeRefs } from '../../../../utilities/mergeRefs';

import { useSkeleton } from '../../hooks';
import { TextSkeletonProps } from '../../type';

import './Title.scss';

import { block } from '../../../../utilities/cn';

import { breakpointsOrder } from '../../../layout/layout-config/breakpoints';
import { useLayoutContext } from '../../../layout/layout-config/LayoutContext';

type NativeProps = HTMLAttributes<HTMLHeadingElement>;

const b = block('typography-title');

export type TitleProps = Omit<NativeProps, 'color'> & {
  /**
   * HTML тег
   */
  tag: 'h1' | 'h2' | 'h3' | 'h4' | 'div';

  /**
   * Толщина шрифта
   */
  weight?: 'regular' | 'medium' | 'bold';

  /**
   * Css-класс для стилизации (native prop)
   */
  className?: string;

  /**
   * Id компонента для тестов
   */
  dataTestId?: string;

  /**
   * Контент (native prop)
   */
  children?: React.ReactNode;

  /**
   * Количество строк
   */
  rowLimit?: '1' | '2' | '3' | 'none';

  /**
   * Показать скелетон
   */
  showSkeleton?: boolean;

  /**
   * Пропы для скелетона
   */
  skeletonProps?: TextSkeletonProps;

  /**
   * Показать мобильный вид компонента, если такой реализован
   */
  isMobileView?: boolean;
};

type TitleElementType = HTMLHeadingElement | HTMLDivElement;

export const Title = forwardRef<TitleElementType, TitleProps>(
  (
    {
      dataTestId,
      tag: Component = 'div',
      weight = 'regular',
      children,
      skeletonProps,
      showSkeleton,
      isMobileView,
      rowLimit = 'none',
      className,
      ...restProps
    },
    ref,
  ) => {
    const { renderSkeleton, textRef } = useSkeleton(showSkeleton, { ...skeletonProps });
    const { activeBreakpoint } = useLayoutContext();

    const isHeader = Component.includes('h');
    const isAcceptMobileStyle =
      isMobileView === undefined ? breakpointsOrder.slice(0, 3).includes(activeBreakpoint) : isMobileView;
    const isDesktopComponent = isAcceptMobileStyle && isHeader;

    const skeleton = renderSkeleton({
      dataTestId,
    });

    if (skeleton) {
      return skeleton;
    }

    return (
      <Component
        className={b(
          {
            title: isDesktopComponent ? Component + '_mobile' : Component,
            color: 'primary',
            [`rowLimit_${rowLimit}`]: Boolean(rowLimit),
          },
          className,
        )}
        ref={mergeRefs([ref, textRef])}
        {...restProps}
      >
        {children}
      </Component>
    );
  },
);
