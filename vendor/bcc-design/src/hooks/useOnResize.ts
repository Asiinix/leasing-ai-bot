import { useEffect, useRef } from 'react';
import { throttle } from 'lodash';

export const useOnResize = (callback: () => void, throttleInterval?: number) => {
  const savedCallback = useRef<(() => void) | null>(null);

  useEffect(() => {
    savedCallback.current = callback;
  }, [callback]);

  useEffect(() => {
    let timeoutId: number;

    const onResize = () => {
      if (savedCallback.current) {
        savedCallback.current();
      }
    };

    window.addEventListener('resize', throttle(onResize, throttleInterval ?? 500));

    timeoutId = window.setTimeout(onResize);

    return () => {
      clearTimeout(timeoutId);
      window.removeEventListener('resize', onResize);
    };
  }, []);
};
