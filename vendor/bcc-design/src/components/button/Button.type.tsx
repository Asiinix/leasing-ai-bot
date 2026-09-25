import {
  AnchorHTMLAttributes,
  ButtonHTMLAttributes,
  CSSProperties,
  FocusEventHandler,
  KeyboardEventHandler,
  MouseEventHandler,
  ReactNode,
} from 'react';
import { KeyboardKeys } from '../../utilities/keyboard';

export type ContainerElement = HTMLButtonElement | HTMLAnchorElement;

export enum EButtonVariant {
  AccentPrimary = 'accentPrimary', // зеленая
  AccentSecondary = 'accentSecondary', // светлая
  AccentTertiary = 'accentTertiary', // зеленая в виде текста
  InvertPrimary = 'invertPrimary', // зеленая
  InvertSecondary = 'invertSecondary', // светлая
  InvertTertiary = 'invertTertiary', // зеленая в виде текста
  Destructive = 'destructive', // красная
  Neutral = 'neutral', // черная в виде текста
  Link = 'link',
  Ghost = 'ghost',
}

type ButtonVariant =
  | 'accentPrimary' // зеленая
  | 'accentSecondary' // светлая
  | 'accentTertiary' // зеленая в виде текста
  | 'invertPrimary'
  | 'invertSecondary'
  | 'invertTertiary'
  | 'destructive' // красная
  | 'neutral' // черная в виде текста
  | 'link'
  | 'ghost'
  | string;

export interface ButtonProps {
  /**
   * Уникальный id компонента
   */
  id?: string;

  /**
   * Определяет стиль кнопки
   */
  view?: ButtonVariant;

  /**
   * Определяет стиль кнопки
   */
  fullWidth?: boolean;

  /**
   * Определяет тип кнопки для работы с формой
   */
  htmlType?: 'button' | 'submit' | 'reset' | undefined;

  /**
   * Выводит ссылку в виде кнопки
   */
  href?: string;

  /**
   * Определяет размер кнопки
   */
  size?: 's' | 'm' | 'l' | 'xl';

  /**
   * Добавляет иконку с лева от текста кнопки
   */
  iconLeft?: ReactNode;

  /**
   * Добавляет иконку с права от текста кнопки
   */
  iconRight?: ReactNode;

  /**
   * Стилевое оформление для визуального выделения прогресса
   */
  loading?: boolean;

  /**
   * Неактивное состояние кнопки.
   * Состояние, при котором кнопка отображается, но недоступна для действий пользователя
   */
  disabled?: boolean;

  /**
   * Дополнительные инлайн стили
   */
  style?: CSSProperties;

  /**
   * Текст кнопки.
   */
  children?: ReactNode;

  /**
   * Набор клавиш, при нажатии на которые выставляется состояние `pressed`
   *
   * @default [Keys.SPACE, Keys.ENTER]
   */
  pressKeys?: KeyboardKeys[];

  /**
   * Обработчик события onKeyDown
   */
  onKeyDown?: KeyboardEventHandler<ContainerElement>;

  /**
   * Обработчик события `onKeyUp`
   */
  onKeyUp?: KeyboardEventHandler<ContainerElement>;

  /**
   * Обработчик клика на кнопку
   */
  onClick?: MouseEventHandler<ContainerElement>;

  /**
   * Набор цветов для компонента
   */
  colors?: 'default' | 'inverted';

  /**
   * Дополнительный класс для кнопки
   */
  className?: string;

  /**
   * Событие по своему действию похоже на `onClick` и возникает в момент нажатия кнопки мыши.
   * `onClick` в каком-то смысле является комбинацией событий `onMouseDown` и `onMouseUp`
   */
  onMouseDown?: MouseEventHandler<ContainerElement>;
  /**
   * Обработчик события `onMouseUp`
   */
  onMouseUp?: MouseEventHandler<ContainerElement>;
  /**
   * Обработчик события `onMouseLeave`
   */
  onMouseLeave?: MouseEventHandler<ContainerElement>;

  /**
   * Обработчик события `onBlur`
   */
  onBlur?: FocusEventHandler<ContainerElement>;
}

export type CommonButtonProps = ButtonProps &
  Partial<AnchorHTMLAttributes<HTMLAnchorElement> | ButtonHTMLAttributes<HTMLButtonElement>>;
