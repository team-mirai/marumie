import type { MonthlyTransactionTotal } from "@/server/contexts/public-finance/domain/models/monthly-transaction-total";

/**
 * 月別収支集計リポジトリインターフェース
 *
 * Interface Segregation Principle に基づき、
 * ITransactionRepository から月次集計機能を分離したインターフェース。
 *
 * 収入・支出を別々に取得するメソッドを提供し、
 * マージ・ソートのドメインロジックはドメイン層に委譲する。
 */
export interface IMonthlyAggregationRepository {
  /**
   * 指定された組織IDと会計年度の月別収入合計を取得する
   * @param organizationIds 政治団体ID配列
   * @param financialYear 会計年度
   * @returns 月別収入合計データの配列
   */
  getIncomeByOrganizationIds(
    organizationIds: string[],
    financialYear: number,
  ): Promise<MonthlyTransactionTotal[]>;

  /**
   * 指定された組織IDと会計年度の月別支出合計を取得する
   * @param organizationIds 政治団体ID配列
   * @param financialYear 会計年度
   * @returns 月別支出合計データの配列
   */
  getExpenseByOrganizationIds(
    organizationIds: string[],
    financialYear: number,
  ): Promise<MonthlyTransactionTotal[]>;
}
