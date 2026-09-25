import React, { FocusEvent, KeyboardEvent, useRef, useState } from 'react';
import { useFocus } from '../../../../hooks/useFocus';
import { block } from '../../../../utilities/cn';
import { isKeyCode, Keys } from '../../../../utilities/keyboard';
import { mergeRefs } from '../../../../utilities/mergeRefs';

import { CommonButtonProps, EButtonVariant } from '../../Button.type';
import { LoadingDots } from '../loading-dots/LoadingDots';

import './BaseButton.scss';

const b = block('button');

export type ContainerElement = HTMLButtonElement | HTMLAnchorElement;

export const BaseButton = React.forwardRef<HTMLAnchorElement | HTMLButtonElement, CommonButtonProps>(
  (
    {
      type = 'button',
      htmlType = 'button',
      fullWidth = false,
      iconLeft,
      iconRight,
      view = EButtonVariant.AccentPrimary,
      size = 'm',
      children,
      href,
      pressKeys = [Keys.SPACE, Keys.ENTER],
      onClick,
      disabled = false,
      loading = false,
      onKeyDown,
      onKeyUp,
      onBlur,
      onMouseDown,
      onMouseUp,
      onMouseLeave,
      style,
      className,
      id,
      ...props
    },
    ref,
  ) => {
    const Component = href ? 'a' : 'button';
    const [pressed, setPressed] = useState<boolean>(false);

    const iconOnly = !children;

    const internalInnerRef = useRef<ContainerElement>(null);
    const [focused] = useFocus(internalInnerRef, 'keyboard');

    const isRightIcon = Boolean(iconRight) && !iconOnly;
    const isLeftIcon = Boolean(iconLeft) && !iconOnly;

    const handleBlur = (event: FocusEvent<ContainerElement>) => {
      setPressed(false);
      if (onBlur !== undefined) {
        onBlur(event);
      }
    };
    const handleKeyDown = (event: KeyboardEvent<ContainerElement>) => {
      if (isKeyCode(event.keyCode, pressKeys)) {
        setPressed(true);
      }

      if (onKeyDown !== undefined) {
        onKeyDown(event);
      }
    };

    const handleKeyUp = (event: KeyboardEvent<ContainerElement>) => {
      if (isKeyCode(event.keyCode, pressKeys)) {
        setPressed(false);
      }

      if (onKeyUp !== undefined) {
        onKeyUp(event);
      }
    };

    const handleMouseDown = (
      event: React.MouseEvent<HTMLAnchorElement, MouseEvent> & React.MouseEvent<HTMLButtonElement, MouseEvent>,
    ) => {
      if (navigator.userAgent.match(/safari/i)) {
        // Предотвращаем всплытие события, т.к. в браузерах Safari происходит blur после нажатия на кнопку.
        event.preventDefault();
      }
      setPressed(true);
      if (onMouseDown !== undefined) {
        onMouseDown(event);
      }
    };

    const handleMouseUp = (
      event: React.MouseEvent<HTMLAnchorElement, MouseEvent> & React.MouseEvent<HTMLButtonElement, MouseEvent>,
    ) => {
      setPressed(false);

      if (onMouseUp) {
        onMouseUp(event);
      }
    };

    const handleMouseLeave = (
      event: React.MouseEvent<HTMLAnchorElement, MouseEvent> & React.MouseEvent<HTMLButtonElement, MouseEvent>,
    ) => {
      setPressed(false);

      if (onMouseLeave !== undefined) {
        onMouseLeave(event);
      }
    };

    const handleClick = (
      e: React.MouseEvent<HTMLAnchorElement, MouseEvent> & React.MouseEvent<HTMLButtonElement, MouseEvent>,
    ) => {
      if (disabled || loading) {
        e.preventDefault();
        e.stopPropagation();
        return;
      }
      // Выставляем программно focus, т.к. в браузерах Safari и Firefox
      // клик по кнопке не выставляет фокус автоматически.
      if (internalInnerRef.current) {
        internalInnerRef.current.focus();
      }
      onClick?.(e);
    };

    const componentProps = {
      className: b(
        {
          view,
          size,
          disabled,
          pressed,
          focused,
          iconOnly,
          fullWidth,
        },
        className,
      ),
    };

    const childrenProps = {
      className: b({
        nowrap: fullWidth,
        stretchText: !iconLeft && !iconRight,
        addonLeft: isLeftIcon,
        addonRight: isRightIcon,
        loading: Boolean(loading),
      }),
    };

    const buttonChildren = (
      <>
        {iconLeft && <span className={b({ loading, addonLeftIcon: isLeftIcon })}>{iconLeft}</span>}
        {children && <span className={childrenProps.className}>{children}</span>}
        {iconRight && <span className={b({ loading, addonRightIcon: isRightIcon })}>{iconRight}</span>}
        {loading && <LoadingDots view={view} size={size} />}
      </>
    );

    return (
      <Component
        {...(props as unknown as any)}
        {...componentProps}
        type={htmlType}
        id={id}
        style={style}
        ref={mergeRefs([ref, internalInnerRef])}
        aria-pressed={props['aria-pressed']}
        aria-disabled={disabled || loading}
        aria-busy={loading}
        disabled={disabled || loading}
        onBlur={handleBlur}
        onKeyDown={handleKeyDown}
        onKeyUp={handleKeyUp}
        onClick={handleClick}
        onMouseLeave={handleMouseLeave}
        onMouseUp={handleMouseUp}
        onMouseDown={handleMouseDown}
        tabIndex={disabled || loading ? -1 : (props.tabIndex ?? 0)}
      >
        {buttonChildren}
      </Component>
    );
  },
);
