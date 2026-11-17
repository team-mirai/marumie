const jstFormatter = new Intl.DateTimeFormat("ja-JP", {
  timeZone: "Asia/Tokyo",
  year: "numeric",
  month: "numeric",
  day: "numeric",
});

/** 日本時間の年・月・日（ゼロ埋めなし） */
function jstDateParts(date: Date): { year: string; month: string; day: string } {
  const parts = jstFormatter.formatToParts(date);
  const value = (type: Intl.DateTimeFormatPartTypes) =>
    parts.find((part) => part.type === type)?.value ?? "";
  return { year: value("year"), month: value("month"), day: value("day") };
}

/**
 * 日付を日本語形式でフォーマットする（日本タイムゾーンを使用）
 * @param dateString - フォーマットする日付文字列（nullの場合は空文字を返す）
 * @returns フォーマットされた日付文字列（v9 の書き方。数字と「更新」の間に半角スペース。例: "2025.1.15 更新"）または空文字
 */
export function formatUpdatedAt(dateString: string | null): string {
  if (!dateString) return "";
  const { year, month, day } = jstDateParts(new Date(dateString));
  return `${year}.${month}.${day} 更新`;
}

/**
 * 「〜時点」の日付（日本時間）。見た目は "2026.11.16時点"、読み上げは "2026年11月16日時点"。
 */
export function formatAsOfDate(date: Date): { text: string; spoken: string } {
  const { year, month, day } = jstDateParts(date);
  return { text: `${year}.${month}.${day}時点`, spoken: `${year}年${month}月${day}日時点` };
}
