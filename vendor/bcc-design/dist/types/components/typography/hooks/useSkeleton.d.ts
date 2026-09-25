import { TextSkeletonProps } from '../type';
import './useSkeleton.scss';
type SkeletonProps = {
    wrapperClassName?: string;
    dataTestId?: string;
};
/**
 * useSkeleton - React-хук для управления состоянием и рендерингом скелетона (Skeleton).
 *
 * @param {boolean} showSkeleton - Флаг, указывающий, нужно ли показывать скелетон.
 * @param {TextSkeletonProps} [skeletonProps] - Пропсы для настройки скелетона.
 * @returns {Object} Объект с функцией renderSkeleton для рендеринга скелетона и ref для отслеживания элемента текста.
 */
export declare function useSkeleton(showSkeleton?: boolean, skeletonProps?: TextSkeletonProps): {
    renderSkeleton: (props: SkeletonProps) => import("react").JSX.Element | null;
    textRef: import("react").RefObject<HTMLElement | null>;
};
export {};
