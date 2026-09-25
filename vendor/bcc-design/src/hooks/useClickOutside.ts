import { RefObject, useEffect } from 'react';

/**
 * ref - реф на dropdown чтобы useClickOutside не отрабатывал при клике внутри
 * handler - обработчик при клике вне рефа
 * excludes - массив доп HTML элементов при которых обработчик не отрабатывает
 * */
export const useClickOutside = (
  ref: RefObject<HTMLElement>,
  handler?: (event?: MouseEvent) => void,
  excludes?: (HTMLElement | null)[],
) => {
  useEffect(() => {
    const listener = (event: MouseEvent) => {
      if (!ref.current || ref.current.contains(event.target as Node)) return;

      if (excludes) {
        for (const excludedElement of excludes) {
          if (excludedElement?.contains(event.target as Node)) return;
        }
      }

      handler?.(event);
    };

    document.addEventListener('click', listener, { capture: true });

    return () => document.removeEventListener('click', listener, { capture: true });
  }, [ref, handler, excludes]);
};
