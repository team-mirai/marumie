/** 棒の外側の端の角丸の半径 */
const BAR_RADIUS = 8;
/** 棒の最大幅 */
const MAX_BAR_WIDTH = 30;
/** 0の線と棒の間のすき間 */
export const BAR_GAP = 2;
/** 金額が小さくても見えるようにする棒の最低の高さ */
const MIN_BAR_HEIGHT = 3;

/** 月ごとの推移のグラフの棒の幅。1か月分の幅の 42%（最大 30px）にして細く見せる。 */
export function monthlyBarWidth(step: number): number {
  return Math.min(MAX_BAR_WIDTH, step * 0.42);
}

/** 金額を棒の高さにする。0の線側に BAR_GAP をあけるぶん短くし、最低 MIN_BAR_HEIGHT は残す。 */
export function monthlyBarHeight(amount: number, pixelsPerYen: number): number {
  return Math.max(amount * pixelsPerYen - BAR_GAP, MIN_BAR_HEIGHT);
}

/** 0の線から上に伸びる棒。上の端だけ角を丸める。 */
export function barUpPath(x: number, top: number, width: number, height: number): string {
  const r = Math.min(BAR_RADIUS, width / 2, height);
  const bottom = top + height;
  return `M${x} ${bottom}V${top + r}Q${x} ${top} ${x + r} ${top}H${x + width - r}Q${x + width} ${top} ${x + width} ${top + r}V${bottom}Z`;
}

/** 0の線から下に伸びる棒。下の端だけ角を丸める。 */
export function barDownPath(x: number, top: number, width: number, height: number): string {
  const r = Math.min(BAR_RADIUS, width / 2, height);
  const bottom = top + height;
  return `M${x} ${top}V${bottom - r}Q${x} ${bottom} ${x + r} ${bottom}H${x + width - r}Q${x + width} ${bottom} ${x + width} ${bottom - r}V${top}Z`;
}
