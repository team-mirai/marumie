import type { MonthlyTransactionTotal } from "@/server/contexts/public-finance/domain/models/monthly-transaction-total";

/**
 * MonthlyAggregation ドメインモデル
 *
 * 月別の収支集計データを表現する。
 * 収入・支出データのマージ、yearMonthフォーマット変換、ソートのドメインロジックを提供する。
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
function formatYearMonth(year: number, month: number): string {
  return `${year}-${month.toString().padStart(2, "0")}`;
}

/**
 * 収入・支出データをマージして MonthlyAggregation[] を生成する
 *
 * - 会計年度の全12ヶ月分のデータを生成（データがない月は収支0として補完）
 * - 年月でグルーピング
 * - yearMonth フォーマット変換
 * - yearMonth でソート
 *
 * @param incomeData 収入の月別合計データ
 * @param expenseData 支出の月別合計データ
 * @param financialYear 会計年度（指定した年の1月〜12月の全月データを生成）
 * @returns マージ・ソート済みの月別収支集計データ（12ヶ月分）
 */
export function aggregateFromTotals(
  incomeData: MonthlyTransactionTotal[],
  expenseData: MonthlyTransactionTotal[],
  financialYear: number,
): MonthlyAggregation[] {
  const monthlyMap = new Map<string, MonthlyAggregation>();

  // 会計年度の全12ヶ月分を初期化（データがない月も収支0として含める）
  for (let month = 1; month <= 12; month++) {
    const yearMonth = formatYearMonth(financialYear, month);
    monthlyMap.set(yearMonth, { yearMonth, income: 0, expense: 0 });
  }

  // 収入データをマージ
  for (const item of incomeData) {
    const yearMonth = formatYearMonth(item.year, item.month);
    const existing = monthlyMap.get(yearMonth);
    if (existing) {
      existing.income = item.totalAmount;
    }
  }

  // 支出データをマージ
  for (const item of expenseData) {
    const yearMonth = formatYearMonth(item.year, item.month);
    const existing = monthlyMap.get(yearMonth);
    if (existing) {
      existing.expense = item.totalAmount;
    }
  }

  return Array.from(monthlyMap.values()).sort((a, b) => a.yearMonth.localeCompare(b.yearMonth));
}
