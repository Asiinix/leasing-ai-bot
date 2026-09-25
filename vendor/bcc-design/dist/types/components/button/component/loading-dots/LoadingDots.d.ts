import { ButtonProps } from '../../Button';
import './LoadingDots.scss';
export interface LoadingDotsProps extends Pick<ButtonProps, 'view'> {
    id?: string;
    size: 's' | 'm' | 'l' | 'xl' | string;
}
export declare const LoadingDots: React.FC<LoadingDotsProps>;
