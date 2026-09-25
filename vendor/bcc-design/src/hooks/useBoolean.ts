import { useCallback, useEffect, useRef, useState } from 'react';

type UseBooleanReturnValue = {
  value: boolean;
  setValue: (value: boolean) => void;
  toggle: () => void;
  setTrue: () => void;
  setFalse: () => void;
};

type UseBooleanOptions = {
  onTrue?: () => void;
  onFalse?: () => void;
  onToggle?: (value: boolean) => void;
};

export function useBoolean(init: boolean, options?: UseBooleanOptions): UseBooleanReturnValue {
  const [value, setValue] = useState(init);
  const initialRunRef = useRef<boolean>(false);

  const { onTrue, onFalse, onToggle } = options || {};

  useEffect(() => {
    /** предотвращаем вызов onFalse при первом рендере */
    if (!initialRunRef.current) {
      initialRunRef.current = true;
      return;
    }

    onToggle?.(value);

    if (value) {
      onTrue?.();
    } else {
      onFalse?.();
    }
  }, [value]);

  return {
    value,
    setValue,
    toggle: useCallback(() => setValue(stateValue => !stateValue), []),
    setTrue: useCallback(() => setValue(true), []),
    setFalse: useCallback(() => setValue(false), []),
  };
}
