/**
 * 貸借対照表セクションの見出しと日付表示を、表示中の年度に応じて決める
 *
 * 過去年度はその年度末（12/31）時点の残高を表示するため、基準日を見出しと日付表示に出す。
 * 現在年度（日本時間の今年以降）は最新時点の残高なので、従来どおり「現時点での」表記と更新日時を出す。
 */
export function getBalanceSheetHeading(
  financialYear: number,
  updatedAt: string,
  now: Date = new Date(),
): { title: string; updatedAt: string } {
  if (financialYear >= getCurrentYearInJapan(now)) {
    return { title: "現時点での貸借対照表", updatedAt };
  }

  return {
    title: `${financialYear}年12月31日時点の貸借対照表`,
    updatedAt: `${financialYear}.12.31時点`,
  };
}

function getCurrentYearInJapan(now: Date): number {
  const year = new Intl.DateTimeFormat("ja-JP", { timeZone: "Asia/Tokyo", year: "numeric" })
    .formatToParts(now)
    .find((part) => part.type === "year")?.value;
  return Number(year);
}
