import React, { CSSProperties } from 'react';
import { HTMLAttrsOf } from '../../utilities/types/utility-types';





export type DropdownPositionType = 'start' | 'center' | 'end';

export type DropdownProps = Omit<HTMLAttrsOf<any>, 'content' | 'className' | 'style'> & {
  /**
   * Идентификатор элемента к которому привязывается Dropdown
   */
  targetId?: string;

  /**
   * Содержимое компонента Dropdown
   */
  content?: React.ReactNode;

  /**
   * Anchor Element
   */
  children?: React.ReactNode;

  /**
   * Открыт ли dropdown
   */
  isOpen?: boolean;

  /**
   * Позиция привязки к таргет элементу - начало / середина / конец (PositionTypeEnum)
   */
  position?: DropdownPositionType;

  /**
   * Отрендерить ли dropdown в div контейнере с position: relative
   */
  withRelativeContainer?: boolean;

  /**
   * Отступ сверху
   */
  offset?: number;

  /**
   * Отступ слева
   */
  offsetLeft?: number;

  /**
   * Отступ справа
   */
  offsetRight?: number;

  /**
   * Матчить ли длину с anchor
   */
  matchAnchorWidth?: boolean;

  /**
   * Обработчик клика вне компонента Dropdown
   */
  onClickOutside?: () => void;

  /**
   * Использовать ли портал
   */
  usePortal?: boolean;

  /**
   * Контейнер для портала
   */
  portalContainer?: Element | DocumentFragment;

  /**
   * Принудительно отрендерить компонент, даже когда dropdown закрыт
   */
  forceRender?: boolean;

  /**
   * Имя класса
   */
  className?: string;
  //
  /**
   * Основные стили компонента
   */
  style?: CSSProperties;

  /**
   * Идентификатор для систем автоматизированного тестирования
   */
  dataTestId?: string;
};
