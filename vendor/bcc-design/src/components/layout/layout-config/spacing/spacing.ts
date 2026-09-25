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
export const generateSpacingStyles = (spacingProps: SpacingProps | undefined): CSSProperties => {
  if (!spacingProps) return {};

  const { mr, ml, mt, mb, mx, my, m, pr, pl, pt, pb, px, py, p } = spacingProps;

  const styles: CSSProperties = {};

  if (mr) styles.marginRight = mr;
  if (ml) styles.marginLeft = ml;
  if (mt) styles.marginTop = mt;
  if (mb) styles.marginBottom = mb;
  if (mx) {
    styles.marginLeft = mx;
    styles.marginRight = mx;
  }
  if (my) {
    styles.marginTop = my;
    styles.marginBottom = my;
  }
  if (m) styles.margin = m;
  if (pr) styles.paddingRight = pr;
  if (pl) styles.paddingLeft = pl;
  if (pt) styles.paddingTop = pt;
  if (pb) styles.paddingBottom = pb;
  if (px) {
    styles.paddingLeft = px;
    styles.paddingRight = px;
  }
  if (py) {
    styles.paddingTop = py;
    styles.paddingBottom = py;
  }
  if (p) styles.padding = p;

  return styles;
};
