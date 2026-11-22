/**
 * 月・勘定科目ごとの借方・貸方合計から、月別の収支を組み立てるドメインサービス
 *
 * 収入・支出のどちらに数えるかはサンキー図と同じ buildNetCategoryAggregation で決める。
 */

import type { MonthlyAccountTotal } from "@/server/contexts/public-finance/domain/models/monthly-account-total";
import {
  type MonthlyAggregation,
  formatYearMonth,
} from "@/server/contexts/public-finance/domain/models/monthly-aggregation";
import { buildNetCategoryAggregation } from "@/server/contexts/public-finance/domain/services/net-category-aggregator";

/**
 * 月・勘定科目ごとの借方・貸方合計から MonthlyAggregation[] を生成する
 *
 * 収入・支出のどちらに数えるか（返金の差し引き、借入金の返済、BS科目の除外、科目マスタに無い科目の扱い）は
 * サンキー図と同じ buildNetCategoryAggregation で月ごとに決めるので、月次の合計は年間の集計と一致する。
 *
 * - 会計年度の全12ヶ月分のデータを生成（データがない月は収支0として補完）
 * - 年月でグルーピング
 * - yearMonth フォーマット変換
 * - yearMonth でソート
 *
 * @param creditTotals 月・勘定科目ごとの貸方合計
 * @param debitTotals 月・勘定科目ごとの借方合計
 * @param financialYear 会計年度（指定した年の1月〜12月の全月データを生成）
 * @returns マージ・ソート済みの月別収支集計データ（12ヶ月分）
 */
export function aggregateFromAccountTotals(
  creditTotals: MonthlyAccountTotal[],
  debitTotals: MonthlyAccountTotal[],
  financialYear: number,
): MonthlyAggregation[] {
  const monthly: MonthlyAggregation[] = [];

  // 会計年度の全12ヶ月分を生成（データがない月も収支0として含める）
  for (let month = 1; month <= 12; month++) {
    const isSameMonth = (item: MonthlyAccountTotal) =>
      item.year === financialYear && item.month === month;
    const { income, expense } = buildNetCategoryAggregation(
      creditTotals.filter(isSameMonth),
      debitTotals.filter(isSameMonth),
    );

    monthly.push({
      yearMonth: formatYearMonth(financialYear, month),
      income: sumTotalAmount(income),
      expense: sumTotalAmount(expense),
    });
  }

  return monthly.sort((a, b) => a.yearMonth.localeCompare(b.yearMonth));
}

function sumTotalAmount(items: { totalAmount: number }[]): number {
  return items.reduce((sum, item) => sum + item.totalAmount, 0);
}
