'use client';

import React from 'react';
import { block } from '../../utilities/cn';

import { SkeletonProps } from './Skeleton.type';

import './Skeleton.scss';

const b = block('skeleton');

export const Skeleton: React.FC<SkeletonProps> = ({
  visible,
  animate = true,
  dataTestId,
  children,
  className = '',
}) => {
  if (visible) {
    return (
      <div className={b({ animate }, className)} data-test-id={dataTestId}>
        {children}
      </div>
    );
  }

  return <div data-test-id={dataTestId}>{children}</div>;
};
