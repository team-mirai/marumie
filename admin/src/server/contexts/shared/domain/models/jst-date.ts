/**
 * 日本時間の今日（YYYY-MM-DD）。
 *
 * 「未来日にできない」「支給日が到来したか」の判定は、サーバーの時計（UTC）やブラウザの時計ではなく
 * 事務所の時計で行う（UTC で数えると、日本時間の 0〜9 時が前日扱いになり、当日の日付を弾いてしまう）。
 * 日本時間は夏時間の無い固定の UTC+9 なので、時差を足して暦日を取り出す。
 */
export function todayInJst(now: Date = new Date()): string {
  return new Date(now.getTime() + 9 * 60 * 60 * 1000).toISOString().slice(0, 10);
}
