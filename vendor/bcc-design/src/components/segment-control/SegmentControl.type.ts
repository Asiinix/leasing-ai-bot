import React, { HTMLAttributes, LegacyRef } from 'react';

type SegmentItemProps = {
  id: number;
  label: string;
  disabled?: boolean;
};

export type NativeProps = HTMLAttributes<HTMLUListElement>;

export type SegmentControlProps = Omit<NativeProps, 'onChange'> & {
  /**
   * ID выбранного сегмента
   */
  selectedId?: number;

  /**
   * Массив сегментов (количество должно быть динамическим)
   */
  items?: SegmentItemProps[];

  /**
   * Форма компонента
   */
  shape?: 'rounded' | 'rectangular';

  /**
   * Размер компонента SegmentControl
   */
  size?: 'xs' | 'sm' | 'md' | 'lg';

  /**
   * Содержимое компонента SegmentControl
   */
  children?: React.ReactNode;

  /**
   * ref на children
   */
  childrenRef?: LegacyRef<HTMLSpanElement> | undefined;

  /**
   * Основные стили компонента
   */
  styles?: { [key: string]: string };

  /**
   * Обработчик нажатия
   */
  onChange?: (id: number) => void;

  /**
   * Идентификатор для систем автоматизированного тестирования
   */
  dataTestId?: string;
};
