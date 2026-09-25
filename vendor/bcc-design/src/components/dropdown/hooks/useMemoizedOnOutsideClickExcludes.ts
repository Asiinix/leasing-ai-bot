import { useEffect, useState } from 'react';

import { getDropdownAnchorElement } from './useCalculateTargetPosition';

/**
 * Возвращает массив anchor элементов для хука useClickOutside.
 * */
export const useMemoizedOnOutsideClickExcludes = (targetId: string | undefined, uid: string) => {
  const [onOutsideClickExcludes, setExcludes] = useState<(HTMLElement | null)[]>([]);

  useEffect(() => {
    setExcludes([getDropdownAnchorElement(targetId, uid)]);
  }, [targetId, uid]);

  return onOutsideClickExcludes;
};
