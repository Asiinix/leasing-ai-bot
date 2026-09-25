'use client';

import { FC, ForwardRefExoticComponent, RefAttributes } from 'react';
import {
  Caption,
  CaptionProps,
  Paragraph,
  ParagraphProps,
  Title,
  TitleProps,
} from './components/index';
import { TextElementType } from './type';

export const Typography: {
  Title: FC<TitleProps>;
  Paragraph: ForwardRefExoticComponent<ParagraphProps & RefAttributes<TextElementType>>;
  Caption: ForwardRefExoticComponent<CaptionProps & RefAttributes<TextElementType>>;
} = {
  Title,
  Paragraph,
  Caption,
};
