/**
 * 日付を日本語形式でフォーマットする（日本タイムゾーンを使用）
 * @param dateString - フォーマットする日付文字列（nullの場合は空文字を返す）
 * @returns フォーマットされた日付文字列（例: "2025.1.15時点"）または空文字
 */
export function formatUpdatedAt(dateString: string | null): string {
  if (!dateString) return "";
  const date = new Date(dateString);

  // 日本タイムゾーンで日付を取得
  const formatter = new Intl.DateTimeFormat("ja-JP", {
    timeZone: "Asia/Tokyo",
    year: "numeric",
    month: "numeric",
    day: "numeric",
  });

  const parts = formatter.formatToParts(date);
  const year = parts.find((part) => part.type === "year")?.value;
  const month = parts.find((part) => part.type === "month")?.value;
  const day = parts.find((part) => part.type === "day")?.value;

  return `${year}.${month}.${day}時点`;
}
