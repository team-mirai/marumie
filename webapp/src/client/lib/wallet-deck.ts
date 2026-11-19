/**
 * トップの「所属議員の調研費」の SP のウォレット（縦に重ねた議員カード）の計算。
 * SP はカードを複数枚同時に開けるので、開いているカードを slug の集まりで持つ。
 */

/** 押したカードだけを開け閉めする（ほかに開いているカードはそのまま）。並びは開いた順 */
export function toggleOpen(open: readonly string[], slug: string): string[] {
  return open.includes(slug) ? open.filter((item) => item !== slug) : [...open, slug];
}

/**
 * カードの下のシート（開いた中身）の上の余白。シートは上端をカードの裏に潜らせているので、
 * カードの高さが cardHeight → targetCardHeight に変わっても、シートの上端がカードの上端から同じ位置に留まる余白を返す
 */
export function anchoredSheetMarginTop(
  marginTop: number,
  cardHeight: number,
  targetCardHeight: number,
): number {
  return marginTop + cardHeight - targetCardHeight;
}

/**
 * 最小の高さ（上下の余白ぶん。カードの裏に隠れている部分）まで縮めたシートが、後ろのカードを押し下げないための下の余白。
 * シートが場所を取らない（上の余白＋高さ＋下の余白が 0）ようにする
 */
export function collapsedSheetMarginBottom(marginTop: number, minHeight: number): number {
  return -(marginTop + minHeight);
}
