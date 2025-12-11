import type {
  BusinessIncomeTransaction,
  GrantIncomeTransaction,
  LoanIncomeTransaction,
  OtherIncomeTransaction,
} from "@/server/domain/types/income-transaction";

export interface IncomeTransactionFilters {
  politicalOrganizationId: string;
  financialYear: number;
}

export interface IReportTransactionRepository {
  /**
   * SYUUSHI07_03: 事業による収入のトランザクションを取得
   */
  findBusinessIncomeTransactions(
    filters: IncomeTransactionFilters,
  ): Promise<BusinessIncomeTransaction[]>;

  /**
   * SYUUSHI07_04: 借入金のトランザクションを取得
   */
  findLoanIncomeTransactions(
    filters: IncomeTransactionFilters,
  ): Promise<LoanIncomeTransaction[]>;

  /**
   * SYUUSHI07_05: 交付金のトランザクションを取得
   */
  findGrantIncomeTransactions(
    filters: IncomeTransactionFilters,
  ): Promise<GrantIncomeTransaction[]>;

  /**
   * SYUUSHI07_06: その他の収入のトランザクションを取得
   */
  findOtherIncomeTransactions(
    filters: IncomeTransactionFilters,
  ): Promise<OtherIncomeTransaction[]>;
}

// Re-export for consumers
export type {
  BusinessIncomeTransaction,
  GrantIncomeTransaction,
  LoanIncomeTransaction,
  OtherIncomeTransaction,
};
