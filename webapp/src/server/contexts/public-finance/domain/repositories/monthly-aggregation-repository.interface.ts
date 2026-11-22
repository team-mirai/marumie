import type { MonthlyAccountTotal } from "@/server/contexts/public-finance/domain/models/monthly-account-total";

/**
 * 月別収支集計リポジトリインターフェース
 *
 * Interface Segregation Principle に基づき、
 * ITransactionRepository から月次集計機能を分離したインターフェース。
 *
 * 月・勘定科目ごとの借方・貸方の合計だけを返し、
 * 収入・支出への分類とマージ・ソートのドメインロジックはドメイン層に委譲する。
 */
export interface IMonthlyAggregationRepository {
  /**
   * 指定された組織IDと会計年度の、月・貸方科目ごとの貸方金額の合計を取得する
   * @param organizationIds 政治団体ID配列
   * @param financialYear 会計年度
   * @returns 月・貸方科目ごとの合計データの配列
   */
  getCreditTotalsByOrganizationIds(
    organizationIds: string[],
    financialYear: number,
  ): Promise<MonthlyAccountTotal[]>;

  /**
   * 指定された組織IDと会計年度の、月・借方科目ごとの借方金額の合計を取得する
   * @param organizationIds 政治団体ID配列
   * @param financialYear 会計年度
   * @returns 月・借方科目ごとの合計データの配列
   */
  getDebitTotalsByOrganizationIds(
    organizationIds: string[],
    financialYear: number,
  ): Promise<MonthlyAccountTotal[]>;
}
