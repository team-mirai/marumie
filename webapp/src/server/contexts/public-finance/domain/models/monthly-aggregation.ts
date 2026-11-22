/**
 * MonthlyAggregation ドメインモデル
 *
 * 月別の収支集計データを表現する。
 * 収支差額の計算と yearMonth フォーマットの定義を提供する。
 * 月・勘定科目ごとの合計からの集計は monthly-net-aggregator が行う。
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

/**
 * 年と月から yearMonth フォーマット文字列を生成する
 * @param year 年
 * @param month 月
 * @returns "YYYY-MM" 形式の文字列
 */
export function formatYearMonth(year: number, month: number): string {
  return `${year}-${month.toString().padStart(2, "0")}`;
}
