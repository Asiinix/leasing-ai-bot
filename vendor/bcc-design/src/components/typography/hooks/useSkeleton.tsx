import { useCallback, useEffect, useRef, useState } from 'react';
import { Skeleton } from '../../skeleton/Skeleton';
import { Row, TextSkeletonProps } from '../type';
import { block } from '../../../utilities/cn';

import './useSkeleton.scss';

const b = block('use-skeleton');

type TextSkeletonParams = {
  height: number;
  rows: number;
  fontSize: string;
  gap: string;
  lineHeight: number;
};

type SkeletonProps = {
  wrapperClassName?: string;
  dataTestId?: string;
};

/**
 * Функция getLineCount вычисляет количество строк внутри элемента.
 * @param {HTMLElement} el - HTML-элемент, для которого нужно вычислить количество строк.
 * @returns {number} - Количество строк в элементе.
 */
const getLineCount = el => {
  // Разбиваем текст на символы
  const characters = el.textContent.split('');
  // Очищаем текстовое содержимое элемента
  el.textContent = '';
  // Переменная для хранения высоты последнего зарегистрированного текста
  let lastRegisteredTextHeight = 0;
  // Счетчик строк
  let lines = 0;
  for (let i = 0; i < characters.length; i++) {
    // Добавляем символ к текстовому содержимому элемента
    el.textContent += characters[i];
    // Получаем текущую высоту текста
    const currentTextHeight = el.offsetHeight;
    // Если текущая высота больше предыдущей, увеличиваем счетчик строк
    if (currentTextHeight > lastRegisteredTextHeight) {
      lines++;
      lastRegisteredTextHeight = currentTextHeight;
    }
  }
  return lines;
};

/**
 * useSkeleton - React-хук для управления состоянием и рендерингом скелетона (Skeleton).
 *
 * @param {boolean} showSkeleton - Флаг, указывающий, нужно ли показывать скелетон.
 * @param {TextSkeletonProps} [skeletonProps] - Пропсы для настройки скелетона.
 * @returns {Object} Объект с функцией renderSkeleton для рендеринга скелетона и ref для отслеживания элемента текста.
 */
export function useSkeleton(showSkeleton?: boolean, skeletonProps?: TextSkeletonProps) {
  const [skeletonParams, setSkeletonParams] = useState<TextSkeletonParams | null>(null);
  const textRef = useRef<HTMLElement>(null);
  const isRowNumber = typeof skeletonProps?.rows === 'number';
  const isRowArray = Array.isArray(skeletonProps?.rows);
  /**
   * updateSkeletonParams - Обновляет параметры скелетона на основе текущего элемента текста.
   */
  const updateSkeletonParams = useCallback(() => {
    if (showSkeleton && textRef.current) {
      const element = textRef.current;
      const style = getComputedStyle(element);
      const textHeight = element.offsetHeight;
      const fontSize = parseInt(style.fontSize, 10);
      let rows: number = getLineCount(element);
      const lineHeight = textHeight / rows;

      if (isRowNumber) {
        rows = skeletonProps?.rows as number;
      }

      if (isRowArray) {
        rows = (skeletonProps?.rows as Row[])?.length as number;
      }

      const gap = skeletonProps?.gap ?? '0px';

      setSkeletonParams(pv => {
        if (!pv || pv.height !== textHeight || pv.rows !== rows) {
          const params = {
            height: textHeight,
            rows: rows || 1,
            fontSize: `${fontSize}px`,
            gap: typeof gap === 'number' ? `${gap}px` : gap,
            lineHeight,
          };
          return params;
        }
        return pv as TextSkeletonParams;
      });
    } else {
      setSkeletonParams(null);
    }
  }, [showSkeleton, skeletonProps?.rows]);

  /**
   * useEffect - Вызывает updateSkeletonParams после первого рендера и при изменении зависимостей.
   */
  useEffect(() => {
    const timeoutId = setTimeout(updateSkeletonParams, 0);
    return () => clearTimeout(timeoutId);
  }, [showSkeleton, skeletonProps?.rows, updateSkeletonParams]);

  /**
   * renderSkeleton - Функция для рендеринга скелетона.
   *
   * @param {SkeletonProps} props - Пропсы для настройки обертки скелетона.
   * @returns {JSX.Element | null} Возвращает компонент скелетона или null.
   */
  const renderSkeleton = useCallback(
    (props: SkeletonProps) => {
      if (showSkeleton && skeletonParams) {
        const { rows, height, fontSize, gap, lineHeight } = skeletonParams;
        const skeletonRows = isRowArray
          ? (skeletonProps?.rows as Row[])
          : Array(rows)
              .fill(null)
              .map((_, i) => i);
        const isOneRow = skeletonRows.length === 1;
        console.log({ isOneRow, skeletonRows, rows, height, fontSize, gap, lineHeight });

        return (
          <div className={props.wrapperClassName} data-test-id={props.dataTestId}>
            {skeletonRows.map((row, i) => (
              <div
                className={b('row')}
                style={{
                  width: isRowArray ? row?.width : '100%',
                  height: `${lineHeight}px`,
                }}
                key={row?.id ? row?.id : i}
              >
                <Skeleton visible={true} className={b()}>
                  <div style={{ height: isOneRow ? height : fontSize }} />
                </Skeleton>
              </div>
            ))}
          </div>
        );
      }
      return null;
    },
    [showSkeleton, skeletonParams, skeletonProps],
  );

  return { renderSkeleton, textRef };
}
