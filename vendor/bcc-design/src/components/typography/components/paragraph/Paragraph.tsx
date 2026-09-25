import React, { forwardRef, HTMLAttributes } from 'react';
import { useSkeleton } from '../../hooks/index';
import { block } from '../../../../utilities/cn';
import { mergeRefs } from '../../../../utilities/mergeRefs';

import { TextSkeletonProps } from '../../type';

import './Paragraph.scss';

const b = block('typography-paragraph');

type NativeProps = HTMLAttributes<HTMLSpanElement>;

export type ParagraphProps = Omit<NativeProps, 'color'> & {
  /**
   * HTML тег
   */
  tag?: 'span' | 'div' | 'p';

  /**
   * [Вариант начертания]
   */
  view?: 'medium' | 'small';

  /**
   * Делает цифры моноширинными
   */
  monospaceNumbers?: boolean;

  /**
   * Декорация текста
   */
  decoration?: 'underline' | 'line-through';

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
};

type ParagraphElementType = HTMLSpanElement | HTMLDivElement;

export const Paragraph = forwardRef<ParagraphElementType, ParagraphProps>(
  (
    {
      tag: Component = 'span',
      weight,
      monospaceNumbers = false,
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
            [decoration || '']: true,
            [view || '']: true,
            [weight || '']: true,
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
