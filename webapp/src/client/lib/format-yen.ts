/**
 * 金額を「1,537万円」「7億2,656万円」「800円」の形で表す（v9 の金額の書き方）。
 * 1万円以上は万円単位に丸め、4桁以上はカンマで区切る。小数・ゼロ埋めは使わない。負の値は先頭に「-」を付ける。
 */
export function formatYen(yen: number): string {
  const abs = Math.round(Math.abs(yen) || 0);
  const sign = yen < 0 && abs > 0 ? "-" : "";
  if (abs < 10_000) return `${sign}${abs.toLocaleString("ja-JP")}円`;
  const man = Math.round(abs / 10_000);
  const oku = Math.floor(man / 10_000);
  const rest = man % 10_000;
  if (oku === 0) return `${sign}${rest.toLocaleString("ja-JP")}万円`;
  return `${sign}${oku.toLocaleString("ja-JP")}億${rest ? `${rest.toLocaleString("ja-JP")}万` : ""}円`;
}
