interface ResearchFundCoverageInput {
  /** published の仕訳がある月（YYYY-MM）。重複していてよい。 */
  months: readonly string[];
  /** 何月分まで公開したか（YYYY-MM）。未設定なら実データの最終月で代用する。 */
  publishedThrough: string | null;
}

/**
 * 「2026年2月〜8月分を公開中」。渡された議員全員分をまとめた公開範囲を返す。
 * 公開されている月が1つも無ければ「準備中」。
 */
export function buildCoverageLabel(politicians: readonly ResearchFundCoverageInput[]): string {
  const months = politicians.flatMap((politician) =>
    politician.publishedThrough
      ? [...politician.months, politician.publishedThrough]
      : [...politician.months],
  );
  if (months.length === 0) return "準備中";

  const start = months.reduce((a, b) => (a < b ? a : b));
  const end = months.reduce((a, b) => (a > b ? a : b));
  const sameYear = start.slice(0, 4) === end.slice(0, 4);
  const range =
    start === end
      ? monthLabel(start)
      : `${monthLabel(start)}〜${sameYear ? monthOnly(end) : monthLabel(end)}`;
  return `${range}分を公開中`;
}

/** 「2026年2月」 */
function monthLabel(month: string): string {
  const [year, monthNumber] = month.split("-");
  return `${Number(year)}年${Number(monthNumber)}月`;
}

/** 「8月」。同じ年の範囲では終端の年を省く。 */
function monthOnly(month: string): string {
  return `${Number(month.split("-")[1])}月`;
}
