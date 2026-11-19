/**
 * 貸借対照表リポジトリインターフェース
 *
 * 貸借対照表の計算に必要なデータを取得するためのインターフェース。
 * Interface Segregation Principle に基づき、ITransactionRepository から分離。
 *
 * `asOfFinancialYear` を受け取るメソッドは、その年度末（12/31）時点の累積残高を返す。
 * 翌年度以降の取引・残高スナップショットは含めない。
 */
export interface IBalanceSheetRepository {
  /**
   * 現金類の残高を取得（各組織の、指定年度末までで最新の残高スナップショットの合計）
   */
  getCashBalance(organizationIds: string[], asOfFinancialYear: number): Promise<number>;

  /**
   * 債権残高を取得（指定年度末までの債権科目（未収入金など）の借方 - 貸方の累積）
   */
  getReceivables(organizationIds: string[], asOfFinancialYear: number): Promise<number>;

  /**
   * 借入金収入を取得（指定年度末までの借入金勘定の貸方合計）
   */
  getBorrowingIncome(organizationIds: string[], asOfFinancialYear: number): Promise<number>;

  /**
   * 借入金支出を取得（指定年度末までの借入金勘定の借方合計）
   */
  getBorrowingExpense(organizationIds: string[], asOfFinancialYear: number): Promise<number>;

  /**
   * 流動負債を取得（指定年度内の取引だけの負債勘定の貸方 - 借方）
   *
   * サンキー図のつじつま合わせで使う年度内の増減。貸借対照表の残高には使わない。
   */
  getCurrentLiabilities(organizationIds: string[], financialYear: number): Promise<number>;

  /**
   * 流動負債残高を取得（指定年度末までの負債勘定の貸方 - 借方の累積）
   */
  getCurrentLiabilitiesBalance(
    organizationIds: string[],
    asOfFinancialYear: number,
  ): Promise<number>;
}
