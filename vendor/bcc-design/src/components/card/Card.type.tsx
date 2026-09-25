import { CSSProperties } from 'react';

export type CardProps = {
  /**
   * Можно передать валидный ReactNode либо текст
   */
  children: React.ReactNode;
  /**
   * Размеры, которые влияют на padding, border-radius
   */
  size?: 's' | 'm';
  /**
   * Типы, которые определяют background, box-shadow
   */
  type?: 'primary' | 'secondary';
  /**
   * Ширина карточки
   */
  width?: CSSProperties['width'];
  /**
   * Максимальная ширина карточки
   */
  maxWidth?: CSSProperties['width'];
  /**
   * Высота карточки
   */
  height?: CSSProperties['height'];
  /**
   * Автоматически центрировать по горизонтали, относительно родительского элемента
   */
  autoCenter?: boolean;
};
