import React, { useEffect, useState } from 'react';

type UseBooleanWithDelayInit = {
  value: boolean;
  delay: number;
};

export const useBooleanValueWithDelay = ({ value, delay = 0 }: UseBooleanWithDelayInit) => {
  const [bool, setBool] = useState(value);

  const timeoutRef = React.useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (value) {
      setBool(true);
    } else {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
      // Set a new timeout
      timeoutRef.current = setTimeout(() => {
        setBool(false);
      }, delay);
    }

    // Clean up the timeout on component unmount
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
        // timeoutRef.current = null;
      }
    };
  }, [value, delay]);

  return bool;
};
