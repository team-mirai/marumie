/**
 * 貸借対照表リポジトリインターフェース
 *
 * 貸借対照表の計算に必要なデータを取得するためのインターフェース。
 * Interface Segregation Principle に基づき、ITransactionRepository から分離。
 */
export interface IBalanceSheetRepository {
  /**
   * 流動資産を取得（各組織の最新残高スナップショットの合計）
   */
  getCurrentAssets(organizationIds: string[]): Promise<number>;

  /**
   * 借入金収入を取得（借入金勘定の貸方合計）
   */
  getBorrowingIncome(organizationIds: string[], financialYear: number): Promise<number>;

  /**
   * 借入金支出を取得（借入金勘定の借方合計）
   */
  getBorrowingExpense(organizationIds: string[], financialYear: number): Promise<number>;

  /**
   * 流動負債を取得（負債勘定の貸方 - 借方）
   */
  getCurrentLiabilities(organizationIds: string[], financialYear: number): Promise<number>;
}
