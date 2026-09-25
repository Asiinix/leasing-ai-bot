import { ReactNode } from 'react';

export enum TooltipPositions {
  TopStart = 'top-start',
  Top = 'top',
  TopEnd = 'top-end',
  BottomStart = 'bottom-start',
  Bottom = 'bottom',
  BottomEnd = 'bottom-end',
  Left = 'left',
  Right = 'right',
}

export enum TooltipTriggers {
  Hover = 'hover',
  Click = 'click',
}

export type TooltipPosition =
  | 'top-start'
  | 'top'
  | 'top-end'
  | 'bottom-start'
  | 'bottom'
  | 'bottom-end'
  | 'left'
  | 'right';

export interface IconAndCounter {
  icon?: ReactNode;
  counter?: string | number;
}

export interface TitleAndDescription {
  title: string;
  description: string;
}

export interface TooltipButton {
  title: string;
  handler: () => void;
}

export interface TooltipButtons {
  primary: TooltipButton;
  secondary?: TooltipButton;
}

export type Trigger = 'hover' | 'click';

export interface TooltipHandle {
  showTooltip: () => void;
  hideTooltip: () => void;
}

export interface TooltipProps {
  id?: string;
  children: ReactNode;
  content?: ReactNode;
  position?: TooltipPosition | TooltipPositions;
  trigger?: Trigger | TooltipTriggers;
  iconAndCounter?: IconAndCounter;
  titleAndDescription?: TitleAndDescription;
  buttons?: TooltipButtons;
  disabled?: boolean;
}
