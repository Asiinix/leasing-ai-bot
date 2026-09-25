'use client';

import { block } from '../../utilities/cn';

import { CardProps } from './Card.type';

import './Card.scss';

const b = block('card');

export const Card = ({
  children,
  size = 'm',
  type = 'primary',
  width = '100%',
  height = '100%',
  maxWidth,
  autoCenter = false,
}: CardProps) => {
  return (
    <div
      className={b('wrapper', {
        [`size-${size}`]: true,
        [type]: true,
        autocenter: autoCenter,
      })}
      style={{
        width,
        height,
        maxWidth,
      }}
    >
      {children}
    </div>
  );
};
