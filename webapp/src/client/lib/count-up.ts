/** 金額のカウントアップにかける時間（v9 と同じ） */
export const COUNT_UP_DURATION_MS = 1600;

/** 経過の割合（0〜1）を、v9 と同じ ease-out（4 乗）で進み具合に変える */
export function easeOutQuart(progress: number): number {
  const p = Math.min(1, Math.max(0, progress));
  return 1 - (1 - p) ** 4;
}

/**
 * 表示中の数字（"1,537"・"-3" など）をカウントアップの終わりの値にする。
 * カンマ区切りの整数でなければ null（数えずにそのまま出す）
 */
export function parseCountUpTarget(text: string): number | null {
  if (!/^-?(\d+|\d{1,3}(,\d{3})+)$/.test(text)) return null;
  return Number(text.replace(/,/g, ""));
}

/** カウントアップ途中の数字。終わりの値と同じ書き方（4桁以上はカンマ区切り・ゼロ埋めなし）にする */
export function countUpText(target: number, progress: number): string {
  const value = Math.round(target * easeOutQuart(progress));
  // -0 を "-0" と出さない
  return (value === 0 ? 0 : value).toLocaleString("ja-JP");
}
