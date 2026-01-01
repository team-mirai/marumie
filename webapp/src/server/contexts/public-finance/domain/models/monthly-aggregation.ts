/**
 * MonthlyAggregation ドメインモデル
 *
 * 月別の収支集計データを表現する。
 * ドメインロジックがほぼないため、型定義とバリデーション関数のみを提供する。
 */

/**
 * 月別収支集計データ
 */
export interface MonthlyAggregation {
  yearMonth: string; // "YYYY-MM" 形式
  income: number;
  expense: number;
}

/**
 * yearMonth のフォーマットを検証する
 * @param yearMonth 検証対象の文字列
 * @returns 有効な "YYYY-MM" 形式の場合は true
 */
export function isValidYearMonthFormat(yearMonth: string): boolean {
  const pattern = /^\d{4}-(0[1-9]|1[0-2])$/;
  return pattern.test(yearMonth);
}

/**
 * 収支差額を計算する
 * @param aggregation 月別収支集計データ
 * @returns 収入 - 支出
 */
export function calculateBalance(aggregation: MonthlyAggregation): number {
  return aggregation.income - aggregation.expense;
}
