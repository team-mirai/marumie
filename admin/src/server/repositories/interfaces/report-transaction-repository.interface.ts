import type { PersonalDonationTransaction } from "@/server/domain/types/donation-transaction";
import type {
  BusinessIncomeTransaction,
  GrantIncomeTransaction,
  LoanIncomeTransaction,
  OtherIncomeTransaction,
} from "@/server/domain/types/income-transaction";

export interface TransactionFilters {
  politicalOrganizationId: string;
  financialYear: number;
}

export interface IReportTransactionRepository {
  /**
   * SYUUSHI07_07 KUBUN1: 個人からの寄附のトランザクションを取得
   * TODO: 寄附者テーブル作成後に実装。現在はダミーデータを返す。
   */
  findPersonalDonationTransactions(
    filters: TransactionFilters,
  ): Promise<PersonalDonationTransaction[]>;

  /**
   * SYUUSHI07_03: 事業による収入のトランザクションを取得
   */
  findBusinessIncomeTransactions(
    filters: TransactionFilters,
  ): Promise<BusinessIncomeTransaction[]>;

  /**
   * SYUUSHI07_04: 借入金のトランザクションを取得
   */
  findLoanIncomeTransactions(
    filters: TransactionFilters,
  ): Promise<LoanIncomeTransaction[]>;

  /**
   * SYUUSHI07_05: 交付金のトランザクションを取得
   */
  findGrantIncomeTransactions(
    filters: TransactionFilters,
  ): Promise<GrantIncomeTransaction[]>;

  /**
   * SYUUSHI07_06: その他の収入のトランザクションを取得
   */
  findOtherIncomeTransactions(
    filters: TransactionFilters,
  ): Promise<OtherIncomeTransaction[]>;
}

// Re-export for consumers
export type {
  PersonalDonationTransaction,
  BusinessIncomeTransaction,
  GrantIncomeTransaction,
  LoanIncomeTransaction,
  OtherIncomeTransaction,
};
