/**
 * 貸借対照表セクションの日付表示を、表示中の年度に応じて決める
 *
 * 過去年度はその年度末（12/31）時点の残高を表示するため、基準日を日付表示に出す。
 * 現在年度（日本時間の今年以降）は最新時点の残高なので、更新日時をそのまま出す。
 */
export function getBalanceSheetAsOf(
  financialYear: number,
  updatedAt: string,
  now: Date = new Date(),
): string {
  if (financialYear >= getCurrentYearInJapan(now)) {
    return updatedAt;
  }

  return `${financialYear}.12.31時点`;
}

function getCurrentYearInJapan(now: Date): number {
  const year = new Intl.DateTimeFormat("ja-JP", { timeZone: "Asia/Tokyo", year: "numeric" })
    .formatToParts(now)
    .find((part) => part.type === "year")?.value;
  return Number(year);
}
