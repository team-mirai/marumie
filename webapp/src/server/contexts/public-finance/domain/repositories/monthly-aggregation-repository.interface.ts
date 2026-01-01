import type { MonthlyAggregation } from "@/server/contexts/public-finance/domain/models/monthly-aggregation";

/**
 * 月別収支集計リポジトリインターフェース
 *
 * Interface Segregation Principle に基づき、
 * ITransactionRepository から月次集計機能を分離したインターフェース。
 */
export interface IMonthlyAggregationRepository {
  /**
   * 指定された組織IDと会計年度の月別収支集計を取得する
   * @param organizationIds 政治団体ID配列
   * @param financialYear 会計年度
   * @returns 月別収支集計データの配列
   */
  getByOrganizationIds(
    organizationIds: string[],
    financialYear: number,
  ): Promise<MonthlyAggregation[]>;
}
