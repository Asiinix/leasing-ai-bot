import { Dispatch, RefObject } from 'react';

import { TooltipPosition } from './Tooltip.type';

export const updateCoords = (
  childRef: RefObject<HTMLDivElement | null>,
  shift: number,
  position: TooltipPosition,
  setCoords: Dispatch<
    React.SetStateAction<{
      top: number;
      left: number;
    }>
  >,
) => {
  const rect = childRef.current?.getBoundingClientRect();
  if (rect) {
    let top = 0,
      left = 0;
    switch (position) {
      case 'top-start':
        top = rect.top - shift;
        left = rect.left;
        break;
      case 'top':
        top = rect.top - shift;
        left = rect.left + rect.width / 2;
        break;
      case 'top-end':
        top = rect.top - shift;
        left = rect.left + rect.width;
        break;
      case 'bottom-start':
        top = rect.bottom + shift;
        left = rect.left;
        break;
      case 'bottom':
        top = rect.bottom + shift;
        left = rect.left + rect.width / 2;
        break;
      case 'bottom-end':
        top = rect.bottom + shift;
        left = rect.left + rect.width;
        break;
      case 'left':
        top = rect.top + rect.height / 2;
        left = rect.left - shift;
        break;
      case 'right':
        top = rect.top + rect.height / 2;
        left = rect.right + shift;
        break;
      default:
        break;
    }
    // Keep centered hints inside narrow screens.
    if (position === 'top' || position === 'bottom') {
      const halfWidth = Math.min(296, window.innerWidth - 32) / 2;
      left = Math.max(16 + halfWidth, Math.min(window.innerWidth - 16 - halfWidth, left));
    }
    setCoords({
      top: top + window.scrollY,
      left: left + window.scrollX,
    });
  }
};
