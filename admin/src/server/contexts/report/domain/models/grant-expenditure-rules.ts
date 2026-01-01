/**
 * 交付金フラグに関するビジネスルールを定義するドメインモデル
 *
 * このファイルは交付金に係る支出フラグ（isGrantExpenditure）の
 * 更新可否判定とバリデーションロジックを定義します。
 */

/**
 * 交付金フラグの更新可否を判定
 *
 * @param transactionType - 'income' | 'expense'
 * @returns 交付金フラグを設定可能な場合true
 *
 * @example
 * ```typescript
 * canSetGrantExpenditureFlag('expense') // true
 * canSetGrantExpenditureFlag('income')  // false
 * ```
 */
export function canSetGrantExpenditureFlag(transactionType: "income" | "expense"): boolean {
  return transactionType === "expense";
}

/**
 * 交付金フラグ更新のバリデーション結果
 */
export interface GrantExpenditureFlagValidationResult {
  isValid: boolean;
  errorMessage?: string;
}

/**
 * 交付金フラグ更新のバリデーションを実行
 *
 * @param transactionType - 'income' | 'expense'
 * @returns バリデーション結果
 *
 * @example
 * ```typescript
 * validateGrantExpenditureFlagUpdate('expense') // { isValid: true }
 * validateGrantExpenditureFlagUpdate('income')  // { isValid: false, errorMessage: '...' }
 * ```
 */
export function validateGrantExpenditureFlagUpdate(
  transactionType: "income" | "expense",
): GrantExpenditureFlagValidationResult {
  if (!canSetGrantExpenditureFlag(transactionType)) {
    return {
      isValid: false,
      errorMessage: "交付金フラグは支出取引のみに設定できます",
    };
  }
  return { isValid: true };
}
