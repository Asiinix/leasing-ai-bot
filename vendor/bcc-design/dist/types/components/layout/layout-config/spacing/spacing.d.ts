import { CSSProperties } from 'react';
export type SpacingProps = {
    /**
     * margin-right
     */
    mr?: CSSProperties['marginRight'];
    /**
     * margin-left
     */
    ml?: CSSProperties['marginLeft'];
    /**
     * margin-top
     */
    mt?: CSSProperties['marginTop'];
    /**
     * margin-bottom
     */
    mb?: CSSProperties['marginBottom'];
    /**
     * margin-left
     * margin-right
     */
    mx?: CSSProperties['marginRight'];
    /**
     * margin-top
     * margin-bottom
     */
    my?: CSSProperties['marginTop'];
    /**
     * margin
     */
    m?: CSSProperties['margin'];
    /**
     * padding-right
     */
    pr?: CSSProperties['paddingRight'];
    /**
     * padding-left
     */
    pl?: CSSProperties['paddingLeft'];
    /**
     * padding-top
     */
    pt?: CSSProperties['paddingTop'];
    /**
     * padding-bottom
     */
    pb?: CSSProperties['paddingBottom'];
    /**
     * padding-left
     * padding-right
     */
    px?: CSSProperties['paddingTop'];
    /**
     * padding-top
     * padding-bottom
     */
    py?: CSSProperties['paddingRight'];
    /**
     * padding
     */
    p?: CSSProperties['padding'];
};
/**
 * Функция возвращает CSSProperties на основе SpacingProps.
 *
 * Приоритет margin: m > mx/my > mt/mb/mr/ml
 * Приоритет padding: p > px/py > pt/pb/pr/pl
 **/
export declare const generateSpacingStyles: (spacingProps: SpacingProps | undefined) => CSSProperties;
