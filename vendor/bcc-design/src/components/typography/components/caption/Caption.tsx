import React, { forwardRef, HTMLAttributes } from 'react';
import { useSkeleton } from '../../hooks/index';
import { block } from '../../../../utilities/cn';
import { mergeRefs } from '../../../../utilities/mergeRefs';

import { TextSkeletonProps } from '../../type';

import './Caption.scss';

const b = block('typography-caption');

type NativeProps = HTMLAttributes<HTMLSpanElement>;

export type CaptionProps = Omit<NativeProps, 'color'> & {
  /**
   * HTML тег
   */
  tag?: 'span' | 'div' | 'p';

  /**
   * Толщина шрифта
   */
  weight?: 'regular' | 'medium' | 'bold';

  /**
   * Делает цифры моноширинными
   */
  monospaceNumbers?: boolean;

  /**
   * [Вариант начертания]
   */
  view?: 'medium' | 'small';

  /**
   * Декорация текста
   */
  decoration?: 'underline' | 'line-through';

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
};

type CaptionElementType = HTMLSpanElement | HTMLDivElement;

export const Caption = forwardRef<CaptionElementType, CaptionProps>(
  (
    {
      tag: Component = 'span',
      monospaceNumbers = false,
      weight,
      view,
      className,
      dataTestId,
      children,
      rowLimit = 'none',
      showSkeleton,
      skeletonProps,
      decoration,
      ...restProps
    },
    ref,
  ) => {
    const { renderSkeleton, textRef } = useSkeleton(showSkeleton, skeletonProps);

    const skeleton = renderSkeleton({
      wrapperClassName: b({
        paragraphWithMargins: Component === 'p',
      }),
      dataTestId,
    });

    if (skeleton) {
      return skeleton;
    }

    return (
      <Component
        className={b(
          {
            paragraph: Component === 'p',
            paragraphWithMargins: Component === 'p',
            monospace: monospaceNumbers,
            [view || '']: true,
            [decoration || '']: true,
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
