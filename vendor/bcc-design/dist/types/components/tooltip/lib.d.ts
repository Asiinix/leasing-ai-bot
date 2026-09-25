import { Dispatch, RefObject } from 'react';
import { TooltipPosition } from './Tooltip.type';
export declare const updateCoords: (childRef: RefObject<HTMLDivElement | null>, shift: number, position: TooltipPosition, setCoords: Dispatch<React.SetStateAction<{
    top: number;
    left: number;
}>>) => void;
