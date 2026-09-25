import { FC, ForwardRefExoticComponent, RefAttributes } from 'react';
import { CaptionProps, ParagraphProps, TitleProps } from './components/index';
import { TextElementType } from './type';
export declare const Typography: {
    Title: FC<TitleProps>;
    Paragraph: ForwardRefExoticComponent<ParagraphProps & RefAttributes<TextElementType>>;
    Caption: ForwardRefExoticComponent<CaptionProps & RefAttributes<TextElementType>>;
};
