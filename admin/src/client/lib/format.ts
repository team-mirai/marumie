/**
 * 日付を YYYY/MM/DD 形式でフォーマットする
 * @param date - フォーマットする日付
 * @returns フォーマットされた日付文字列
 */
export function formatDate(date: Date): string {
  const d = new Date(date);
  return `${d.getFullYear()}/${String(d.getMonth() + 1).padStart(2, "0")}/${String(d.getDate()).padStart(2, "0")}`;
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
