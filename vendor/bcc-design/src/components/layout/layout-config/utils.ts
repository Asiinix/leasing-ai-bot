import { breakpointsByOrder, BreakpointsKeys, breakpointsOrder } from './breakpoints';
import { IsMediaActive, MediaPartial } from './LayoutContext.type';

export const isMediaActiveFactory =
  (activeType: BreakpointsKeys): IsMediaActive =>
  toCheck => {
    return activeType in breakpointsByOrder
      ? breakpointsByOrder[activeType as BreakpointsKeys] - breakpointsByOrder[toCheck] >= 0
      : false;
  };

export const getClosestMediaPropsFactory =
  (currentActive: BreakpointsKeys) =>
  <T>(medias: MediaPartial<T> = {}): T | undefined => {
    if (!currentActive) {
      return undefined;
    }

    let candidate = currentActive;

    while (candidate) {
      if (medias[candidate]) {
        return medias[candidate];
      }

      candidate = breakpointsOrder[breakpointsByOrder[candidate] - 1];
    }

    return undefined;
  };
