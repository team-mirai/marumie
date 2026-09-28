/** ラベル末尾と図の端のあいだに残すゆとり（太字や記号の字幅のぶれを吸収する）。 */
const LABEL_EDGE_PADDING = 4;

/**
 * サンキーの左右の余白。端のノードのラベル（ノードからの距離 + 1行の最大文字数ぶんの幅）が
 * 図の外にはみ出さない幅にする。全角1文字の幅はフォントサイズと同じとみなす。
 */
export function getSankeyHorizontalMargin(
  labelOffset: number,
  fontSizePx: number,
  maxCharsPerLine: number,
): number {
  return Math.ceil(labelOffset + fontSizePx * maxCharsPerLine) + LABEL_EDGE_PADDING;
}
