import React, { CSSProperties, memo } from 'react';
import { block } from '../../../../utilities/cn';

import './DropdownRelativeContainer.scss';

const b = block('dropdown-relative-container');

type Props = {
  children?: React.ReactNode;
  withRelativeContainer?: boolean;
  className: string;
  style: CSSProperties;
};

export const DropdownRelativeContainer = memo(({ children, withRelativeContainer = true, className, style }: Props) => {
  if (!withRelativeContainer) return children;

  return (
    <div className={b('', className)} style={style}>
      {children}
    </div>
  );
});
