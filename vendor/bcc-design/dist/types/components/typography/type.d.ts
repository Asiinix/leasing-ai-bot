export type TextElementType = HTMLParagraphElement | HTMLSpanElement | HTMLDivElement;
export type Row = {
    id: number;
    width: string;
};
export type TextSkeletonProps = {
    /**
     *  Кол-во строк текста
     */
    rows?: number | Row[];
    /**
     *  Расстояние между строками
     */
    gap?: string;
};
