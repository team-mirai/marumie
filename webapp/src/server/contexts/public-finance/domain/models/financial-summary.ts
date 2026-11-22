/**
 * 見出しに出す収支の総額（収入総額・支出総額・現金残高）を表現するドメインモデル
 *
 * 政党・政治団体ページの見出し、トップページのカード、シェア画像が同じ数字を出す。
 * サンキー図と同じ集計（CategoryAggregation と残高）から求め、図のノードやラベルには依存しない。
 */
import {
  type BalanceInfo,
  CategoryAggregation,
} from "@/server/contexts/public-finance/domain/models/category-aggregation";

export interface FinancialSummary {
  /** 収入総額（正味が正の収入の項目と、昨年からの現金残高の合計） */
  income: number;
  /** 支出総額（収入総額から現金残高を引いた値） */
  expense: number;
  /** 現金残高（未払費用が現金を上回るときは未払費用の額） */
  balance: number;
}

export const FinancialSummary = {
  /**
   * 残高を足す前のカテゴリ別集計と残高から、見出しの総額を求める。
   *
   * - 収入総額: 正味が正の収入の項目の合計に、昨年からの現金残高（正のときだけ）を足したもの。
   *   サンキー図の「合計」に流れ込む額と一致する
   * - 現金残高: 今年の現金残高が正のとき、現金残高と未払費用の大きい方。正でなければ 0。
   *   サンキー図（詳細の区分）の「現金残高」は未払費用と収支に分けて描くので、
   *   未払費用が現金を上回ると未払費用の額になる（現在の表示を保っている。定義の見直しは別 Issue）
   * - 支出総額: 収入総額 − 現金残高
   */
  calculate(aggregation: CategoryAggregation, balance: BalanceInfo): FinancialSummary {
    const incomeItems = CategoryAggregation.dropNonPositiveItems(aggregation).income;
    const previousYearBalance = Math.max(balance.previousYearBalance, 0);
    const income =
      incomeItems.reduce((sum, item) => sum + item.totalAmount, 0) + previousYearBalance;

    const cashBalance =
      balance.currentYearBalance > 0
        ? Math.max(balance.currentYearBalance, balance.liabilityBalance)
        : 0;

    return { income, expense: income - cashBalance, balance: cashBalance };
  },
};
