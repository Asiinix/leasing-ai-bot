'use client';

import React, { forwardRef, memo, useId, useRef } from 'react';
import { useClickOutside } from '../../hooks/useClickOutside';
import { block } from '../../utilities/cn';
import { mergeRefs } from '../../utilities/mergeRefs';

import { DropdownRelativeContainer } from './components/dropdown-relative-container';
import { DropdownPortal } from './components/portal';
import { DropdownProps } from './Dropdown.type';
import { useBooleanValueWithDelay } from './hooks/useBooleanValueWithDelay';
import { useCalculateTargetPosition } from './hooks/useCalculateTargetPosition';
import { useMemoizedOnOutsideClickExcludes } from './hooks/useMemoizedOnOutsideClickExcludes';

import './Dropdown.scss';

import { Stack, stackingOrder } from '../stack';

const b = block('dropdown');

export const Dropdown = memo(
  forwardRef(
    (
      {
        as: Component = 'div',
        children,
        isOpen = false,
        position = 'start',
        onClickOutside,
        content,
        targetId,
        offset = 4,
        offsetLeft = 0,
        offsetRight = 0,
        withRelativeContainer,
        matchAnchorWidth = false,
        // className = '',
        // style,
        dataTestId,

        usePortal = true,
        portalContainer,
        forceRender = false,

        className = '',
        style = {},

        ...rest
      }: DropdownProps,
      ref: React.ForwardedRef<HTMLElement>,
    ) => {
      const uid = useId();
      const withTargetId = Boolean(targetId);

      const isOpenWithDelay = useBooleanValueWithDelay({ value: isOpen, delay: 200 });

      const dropDownRef = useRef<HTMLElement>(null);
      const { dropdownPositionStyle } = useCalculateTargetPosition({
        isOpen: isOpenWithDelay,
        targetId,
        position,
        dropDownRef,
        matchAnchorWidth,
        uid,
        offset,
        offsetLeft,
        offsetRight,
      });

      const getAnchorElement = () => {
        // Если есть targetId, значит target будет искаться через getElementById
        if (withTargetId) return null;

        // Если мы тут, значит target будет искаться через data-attr 'data-bcc-dropdown-anchor'
        // Для того чтобы поместить data-attr, нужно чтобы элемент был валидный
        // Если элемент не валидный возвращаем null
        if (!React.isValidElement(children)) {
          console.warn('Чтобы обернуть компонент Dropdown, children должен быть валидным React элементом.');
          return null;
        }
        // Элемент с дата атрибутом data-bcc-dropdown-anchor
        return React.cloneElement(children, { 'data-bcc-dropdown-anchor': uid } as any);
      };

      const onOutsideClickExcludes = useMemoizedOnOutsideClickExcludes(targetId, uid);

      useClickOutside(dropDownRef, onClickOutside, onOutsideClickExcludes);

      return (
        <>
          {getAnchorElement()}
          <Stack value={stackingOrder.POPOVER}>
            {computedZIndex => (
              <DropdownPortal usePortal={usePortal} portalContainer={portalContainer}>
                <DropdownRelativeContainer
                  withRelativeContainer={withRelativeContainer}
                  className={className}
                  style={{ ...style, zIndex: computedZIndex }}
                >
                  <Component
                    {...rest}
                    ref={mergeRefs([ref, dropDownRef])}
                    className={b({ shown: isOpen })}
                    style={{ ...dropdownPositionStyle, position: 'absolute', zIndex: computedZIndex }}
                    data-test-id={dataTestId}
                  >
                    {forceRender || isOpenWithDelay ? content : null}
                  </Component>
                </DropdownRelativeContainer>
              </DropdownPortal>
            )}
          </Stack>
        </>
      );
    },
  ),
);
