/**
 * Transaction Utilities
 *
 * 共通ドメインロジック（取引金額の解決、テキスト正規化など）
 */

/**
 * 借方/貸方から取引金額を解決する（収入用）
 * 収入の場合は貸方金額を優先
 */
export function resolveIncomeAmount(
  debitAmount: number,
  creditAmount: number,
): number {
  if (Number.isFinite(creditAmount) && creditAmount > 0) {
    return creditAmount;
  }
  return Number.isFinite(debitAmount) ? debitAmount : 0;
}

/**
 * 借方/貸方から取引金額を解決する（支出用）
 * 支出の場合は借方金額を優先
 */
export function resolveExpenseAmount(
  debitAmount: number,
  creditAmount: number,
): number {
  if (Number.isFinite(debitAmount) && debitAmount > 0) {
    return debitAmount;
  }
  return Number.isFinite(creditAmount) ? creditAmount : 0;
}

/**
 * テキストを正規化する（空白の統一、トリム、最大長制限）
 */
export function sanitizeText(
  value: string | null | undefined,
  maxLength?: number,
): string {
  if (!value) {
    return "";
  }

  const normalized = value.replace(/\s+/g, " ").trim();
  if (maxLength && normalized.length > maxLength) {
    return normalized.slice(0, maxLength);
  }

  return normalized;
}

/**
 * 10万円の閾値（政治資金報告書における明細記載基準）
 */
export const TEN_MAN_THRESHOLD = 100_000;

/**
 * 金額が閾値以上かどうかを判定
 */
export function isAboveThreshold(
  amount: number,
  threshold: number = TEN_MAN_THRESHOLD,
): boolean {
  return amount >= threshold;
}

/**
 * 備考フィールドを構築する
 */
export function buildBikou(
  transactionNo: string,
  memo: string | null | undefined,
  memoMaxLength: number = 160,
  totalMaxLength: number = 200,
): string {
  const mfRowInfo = `MF行番号: ${transactionNo || "-"}`;
  const memoText = sanitizeText(memo, memoMaxLength);
  const combined = memoText ? `${memoText} / ${mfRowInfo}` : mfRowInfo;

  return sanitizeText(combined, totalMaxLength) || mfRowInfo;
}
