'use client';

import { forwardRef, useEffect, useId, useImperativeHandle, useRef, useState } from 'react';
import { block } from '../../utilities/cn';
import { createPortal } from 'react-dom';

import { Button } from '../button/Button';
import { EButtonVariant } from '../button/Button.type';
import { updateCoords } from './lib';
import { TooltipHandle, TooltipPositions, TooltipProps, TooltipTriggers } from './Tooltip.type';
import { useTooltip } from './useTooltip';

import './Tooltip.scss';

import { Stack, stackingOrder } from '../stack';

const b = block('tooltip');

export const Tooltip = forwardRef<TooltipHandle, TooltipProps>(
  (
    {
      children,
      id,
      content,
      position = TooltipPositions.Top,
      trigger = TooltipTriggers.Hover,
      iconAndCounter,
      titleAndDescription,
      buttons,
      disabled = false,
    }: TooltipProps,
    ref,
  ) => {
    const { childRef, tooltipRef, coords, setCoords, visible, hideTooltip, showTooltip } = useTooltip(trigger);
    const [animationClass, setAnimationClass] = useState('');
    const closeTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
    useEffect(() => () => clearTimeout(closeTimer.current), []);

    const generatedId = useId();
    const tooltipId = id ?? `tooltip-${generatedId}`;
    const open = () => {
      clearTimeout(closeTimer.current);
      if (disabled) return;
      showTooltip();
      setAnimationClass('enter');
      updateCoords(childRef, 12, position, setCoords);
    };
    const close = () => {
      clearTimeout(closeTimer.current);
      hideTooltip();
    };
    useImperativeHandle(ref, () => ({ showTooltip: open, hideTooltip: close }));
    const handleMouseEnter = () => {
      if (trigger === TooltipTriggers.Hover) open();
    };
    const handleMouseLeave = () => {
      if (trigger === TooltipTriggers.Hover) {
        clearTimeout(closeTimer.current);
        closeTimer.current = setTimeout(close, 150);
      }
    };
    const handleClick = () => {
      if (trigger === TooltipTriggers.Click && visible) close();
      else open();
    };

    return (
      <div className={b({})} ref={childRef}>
        <div
          onMouseEnter={handleMouseEnter}
          onMouseLeave={handleMouseLeave}
          onClick={handleClick}
          onFocus={handleMouseEnter}
          onBlur={close}
        >
          {children}
        </div>
        {visible &&
          !disabled &&
          createPortal(
            <Stack value={stackingOrder.MODAL}>
              {computedZIndex => (
                <div
                  className={`${b(`tooltip-${position}`)} ${animationClass}`}
                  ref={tooltipRef}
                  style={{ top: `${coords.top}px`, left: `${coords.left}px`, zIndex: computedZIndex }}
                  onMouseEnter={handleMouseEnter}
                  onMouseLeave={handleMouseLeave}
                  role={'tooltip'}
                  id={tooltipId}
                >
                  {iconAndCounter && (
                    <div
                      className={b({
                        ['tooltip-icon-counter']: Boolean(iconAndCounter),
                        ['tooltip-icon-justify']: Boolean(iconAndCounter.icon) && !Boolean(iconAndCounter.counter),
                        ['tooltip-counter-justify']: Boolean(iconAndCounter.counter) && !Boolean(iconAndCounter.icon),
                        ['tooltip-icon-counter-justify']:
                          Boolean(iconAndCounter.counter) && Boolean(iconAndCounter.icon),
                      })}
                    >
                      {iconAndCounter.icon && <>{iconAndCounter.icon}</>}
                      {iconAndCounter.counter && <div>{iconAndCounter.counter}</div>}
                    </div>
                  )}

                  {titleAndDescription && titleAndDescription.title && titleAndDescription.description && (
                    <div className={b('tooltip-title-description')}>
                      <h2 className={b('title')}>{titleAndDescription.title}</h2>
                      <div className={b('description')}>{titleAndDescription.description}</div>
                    </div>
                  )}

                  {content && <div className={b('tooltip-content')}>{content}</div>}

                  {buttons && (
                    <div className={b('tooltip-buttons')}>
                      {buttons.primary && (
                        <Button view={EButtonVariant.InvertPrimary} onClick={buttons.primary.handler} size={'s'}>
                          {buttons.primary.title}
                        </Button>
                      )}
                      {buttons.secondary && (
                        <Button view={EButtonVariant.InvertTertiary} onClick={buttons.secondary.handler} size={'s'}>
                          {buttons.secondary.title}
                        </Button>
                      )}
                    </div>
                  )}

                  <div className={b(`tooltip-arrow-${position}`)} />
                </div>
              )}
            </Stack>,
            document.body,
          )}
      </div>
    );
  },
);
