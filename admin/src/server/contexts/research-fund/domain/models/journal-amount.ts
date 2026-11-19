/**
 * 仕訳の金額（円）の範囲。
 *
 * 金額は円の整数で持つ。上限は永続化先の Decimal(12, 0) に合わせ、保存できない額は
 * ドメインの入口で弾く（DB まで通してから落ちると、複式の片側だけが書かれかねない）。
 */

/** 金額の上限（円）。DB の Decimal(12, 0) に収まる最大値 */
export const MAX_JOURNAL_AMOUNT = 999_999_999_999;

/** 1 円以上・上限以下の整数か */
export function isJournalAmount(amount: number): boolean {
  return Number.isSafeInteger(amount) && amount > 0 && amount <= MAX_JOURNAL_AMOUNT;
}

/** 金額が範囲外のときに利用者に見せる文。上限の表記を 1 か所に保つ */
export const INVALID_JOURNAL_AMOUNT_MESSAGE = `金額は1円以上${MAX_JOURNAL_AMOUNT}円以下の整数で指定してください`;
