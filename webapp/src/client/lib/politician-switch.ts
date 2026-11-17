/**
 * SP の議員ページの見出しカードを前後の議員へ切り替える動き（デザイン v9 の mmGo / swS / swM / swE）。
 * 議員ごとに URL が分かれているので、どちら向きに切り替えたかを sessionStorage に残し、遷移先のページで読んで入ってくる向きを決める。
 */

/** 次へ（右から入る）なら 1、前へ（左から入る）なら -1 */
export type SwitchDirection = 1 | -1;

/** 切り替えたときに残すメモ。遷移先が to の議員のときだけ使う */
interface SwitchMemo {
  from: string;
  to: string;
  direction: SwitchDirection;
}

export const SWITCH_MEMO_KEY = "politician-switch";

/** 縦横どちらの動きかを決めるまでの遊び（px） */
const AXIS_SLOP = 8;
/** 離したときにこれ以上横へ動いていれば切り替える（px） */
const SWIPE_THRESHOLD = 48;

/**
 * 指の動きが横向きか。動きが小さいうちは決めない（null）。
 * 横の動きが縦の 1.2 倍を超えたときだけ横とし、縦スクロールを邪魔しない。
 */
export function swipeIsHorizontal(dx: number, dy: number): boolean | null {
  if (Math.abs(dx) <= AXIS_SLOP && Math.abs(dy) <= AXIS_SLOP) return null;
  return Math.abs(dx) > Math.abs(dy) * 1.2;
}

/** 指についてカードを動かす量。動かすほど重くなるゴムのような抵抗をかける */
export function rubberBand(dx: number): number {
  return dx / (1 + Math.abs(dx) / 260);
}

/** カードを動かしている間の transform と opacity（少し傾いて薄くなる） */
export function swipeCardStyle(dx: number): { transform: string; opacity: string } {
  const r = rubberBand(dx);
  return {
    transform: `translate3d(${r}px,0,0) rotate(${r / 60}deg)`,
    opacity: String(1 - Math.min(Math.abs(r) / 400, 0.25)),
  };
}

/** 離したときの切り替え先。左へ払えば次、右へ払えば前。足りなければ null（元の位置に戻す） */
export function swipeDirection(dx: number): SwitchDirection | null {
  if (Math.abs(dx) < SWIPE_THRESHOLD) return null;
  return dx < 0 ? 1 : -1;
}

/** sessionStorage に残すメモの文字列 */
export function serializeSwitchMemo(memo: SwitchMemo): string {
  return JSON.stringify(memo);
}

/** 残したメモを読む。壊れている・表示中の議員宛てでないときは null（URL から直接開いたときなど） */
export function parseSwitchMemo(raw: string | null, currentSlug: string): SwitchMemo | null {
  if (!raw) return null;
  try {
    const memo: unknown = JSON.parse(raw);
    if (
      typeof memo === "object" &&
      memo !== null &&
      "from" in memo &&
      "to" in memo &&
      "direction" in memo &&
      typeof memo.from === "string" &&
      memo.to === currentSlug &&
      (memo.direction === 1 || memo.direction === -1)
    ) {
      return { from: memo.from, to: memo.to, direction: memo.direction };
    }
  } catch {
    // 壊れたメモは無視する
  }
  return null;
}
