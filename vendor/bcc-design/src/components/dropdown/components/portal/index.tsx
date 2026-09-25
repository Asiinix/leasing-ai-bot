import { memo, ReactNode, useEffect, useState } from 'react';
import { createPortal } from 'react-dom';

import { DropdownProps } from '../../Dropdown.type';

type DropdownPortalProps = Pick<DropdownProps, 'usePortal' | 'portalContainer'> & {
  children?: ReactNode;
};

export const DropdownPortal = memo(({ children, usePortal, portalContainer }: DropdownPortalProps) => {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  if (!usePortal) return children;
  if (!mounted) return null;

  const PortalContainer = portalContainer || document.body;
  return createPortal(children, PortalContainer);
});
