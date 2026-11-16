/**
 * 日付を日本語形式でフォーマットする（日本タイムゾーンを使用）
 * @param dateString - フォーマットする日付文字列（nullの場合は空文字を返す）
 * @param options.spaced - 日付と「更新」の間に空白を入れる（トップページのカード。例: "2025.1.15 更新"）
 * @returns フォーマットされた日付文字列（例: "2025.1.15更新"）または空文字
 */
export function formatUpdatedAt(
  dateString: string | null,
  options: { spaced?: boolean } = {},
): string {
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

  return `${year}.${month}.${day}${options.spaced ? " " : ""}更新`;
}
