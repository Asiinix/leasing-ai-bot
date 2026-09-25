import { ButtonProps } from '../../Button';
import { block } from '../../../../utilities/cn';

import './LoadingDots.scss';

const b = block('button-loading-dots');

export interface LoadingDotsProps extends Pick<ButtonProps, 'view'> {
  id?: string;
  size: 's' | 'm' | 'l' | 'xl' | string;
}

export const LoadingDots: React.FC<LoadingDotsProps> = ({ view = 'accentSecondary', size }) => {
  const dotClassName = b('dot', { [view]: true, [size]: true });

  return (
    <div className={b()}>
      <div className={dotClassName} />
      <div className={dotClassName} />
      <div className={dotClassName} />
    </div>
  );
};
