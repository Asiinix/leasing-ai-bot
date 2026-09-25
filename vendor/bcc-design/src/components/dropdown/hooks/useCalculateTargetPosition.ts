import { useEffect, useState } from 'react';

export const getDropdownAnchorElement = (targetId: string | undefined, uid: string) =>
  targetId ? document.getElementById(targetId) : document.querySelector<HTMLElement>(`[data-bcc-dropdown-anchor="${uid}"]`);

export const useCalculateTargetPosition = ({
  isOpen, targetId, position, dropDownRef, matchAnchorWidth, uid, offset, offsetLeft, offsetRight,
}) => {
  const [dropdownPositionStyle, setDropdownPositionStyle] = useState({});

  useEffect(() => {
    if (!isOpen) return;
    const anchor = getDropdownAnchorElement(targetId, uid);
    const dropdown = dropDownRef.current as HTMLElement | null;
    if (!anchor || !dropdown) return;

    const update = () => {
      const rect = anchor.getBoundingClientRect();
      const parent = dropdown.offsetParent as HTMLElement | null;
      const parentRect = parent?.getBoundingClientRect();
      const width = matchAnchorWidth ? rect.width - offsetLeft - offsetRight : dropdown.offsetWidth;
      const availableBelow = window.innerHeight - rect.bottom - offset - 8;
      const availableAbove = rect.top - offset - 8;
      const above = dropdown.scrollHeight > availableBelow && availableAbove > availableBelow;
      const maxHeight = Math.max(0, above ? availableAbove : availableBelow);
      const height = Math.min(dropdown.scrollHeight, maxHeight);
      const top = above ? rect.top - offset - height : rect.bottom + offset;
      let left = position === 'center' ? rect.left + (rect.width - width) / 2
        : position === 'end' ? rect.right - width - offsetRight : rect.left + offsetLeft;
      left = Math.max(8, Math.min(left, window.innerWidth - width - 8));
      setDropdownPositionStyle({
        top: `${top - (parentRect?.top ?? -window.scrollY) + (parent?.scrollTop ?? 0) - (parent?.clientTop ?? 0)}px`,
        left: `${left - (parentRect?.left ?? -window.scrollX) + (parent?.scrollLeft ?? 0) - (parent?.clientLeft ?? 0)}px`,
        ...(matchAnchorWidth ? { width: `${width}px` } : {}),
        maxHeight: `${maxHeight}px`,
        overflowY: 'auto',
        transformOrigin: above ? 'bottom' : 'top',
      });
    };
    update();
    const observer = new ResizeObserver(update);
    observer.observe(anchor);
    observer.observe(dropdown);
    window.addEventListener('resize', update);
    window.addEventListener('scroll', update, true);
    return () => {
      observer.disconnect();
      window.removeEventListener('resize', update);
      window.removeEventListener('scroll', update, true);
    };
  }, [isOpen, targetId, uid, position, offset, offsetLeft, offsetRight, matchAnchorWidth, dropDownRef]);

  return { dropdownPositionStyle };
};
