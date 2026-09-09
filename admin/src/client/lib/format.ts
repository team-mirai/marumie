/**
 * 日付を YYYY.MM.DD 形式でフォーマットする（Team Mirai ブランドの日付表記）
 * @param date - フォーマットする日付
 * @returns フォーマットされた日付文字列（例: 2025.01.31）
 */
export function formatDate(date: Date | string): string {
  const d = new Date(date);
  return `${d.getFullYear()}.${String(d.getMonth() + 1).padStart(2, "0")}.${String(d.getDate()).padStart(2, "0")}`;
}

/**
 * 金額を日本円形式でフォーマットする
 * ユーザーのブラウザロケールに基づいて数値をフォーマットします
 * @param amount - フォーマットする金額
 * @returns フォーマットされた金額文字列（例: ¥1,234）
 */
export function formatAmount(amount: number): string {
  return `¥${amount.toLocaleString()}`;
}

/**
 * 金額を日本円形式でフォーマットする（ja-JPロケール指定版）
 * レポート等、一貫した日本語形式が必要な場合に使用します
 * @param amount - フォーマットする金額
 * @returns フォーマットされた金額文字列（例: ¥1,234）
 */
export function formatCurrency(amount: number): string {
  return `¥${amount.toLocaleString("ja-JP")}`;
}

/**
 * 日時を YYYY.MM.DD HH:mm 形式でフォーマットする（登録日時など、時刻まで示す場合）
 * @param date - フォーマットする日時
 * @returns フォーマットされた日時文字列（例: 2025.01.31 09:05）
 */
export function formatDateTime(date: Date | string): string {
  const d = new Date(date);
  const hours = String(d.getHours()).padStart(2, "0");
  const minutes = String(d.getMinutes()).padStart(2, "0");
  return `${formatDate(d)} ${hours}:${minutes}`;
}
