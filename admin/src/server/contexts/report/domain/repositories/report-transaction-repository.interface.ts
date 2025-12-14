import type { PersonalDonationTransaction } from "@/server/contexts/report/domain/models/donation-transaction";
import type {
  AdvertisingExpenseTransaction,
  DonationGrantExpenseTransaction,
  ElectionExpenseTransaction,
  FundraisingPartyExpenseTransaction,
  OfficeExpenseTransaction,
  OrganizationExpenseTransaction,
  OtherBusinessExpenseTransaction,
  OtherPoliticalExpenseTransaction,
  PublicationExpenseTransaction,
  ResearchExpenseTransaction,
  SuppliesExpenseTransaction,
  UtilityExpenseTransaction,
} from "@/server/contexts/report/domain/models/expense-transaction";
import type {
  BusinessIncomeTransaction,
  GrantIncomeTransaction,
  LoanIncomeTransaction,
  OtherIncomeTransaction,
} from "@/server/contexts/report/domain/models/income-transaction";

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

  /**
   * SYUUSHI07_14 KUBUN1: 光熱水費のトランザクションを取得
   */
  findUtilityExpenseTransactions(
    filters: TransactionFilters,
  ): Promise<UtilityExpenseTransaction[]>;

  /**
   * SYUUSHI07_14 KUBUN2: 備品・消耗品費のトランザクションを取得
   */
  findSuppliesExpenseTransactions(
    filters: TransactionFilters,
  ): Promise<SuppliesExpenseTransaction[]>;

  /**
   * SYUUSHI07_14 KUBUN3: 事務所費のトランザクションを取得
   */
  findOfficeExpenseTransactions(
    filters: TransactionFilters,
  ): Promise<OfficeExpenseTransaction[]>;

  /**
   * SYUUSHI07_15 KUBUN1: 組織活動費のトランザクションを取得
   */
  findOrganizationExpenseTransactions(
    filters: TransactionFilters,
  ): Promise<OrganizationExpenseTransaction[]>;

  /**
   * SYUUSHI07_15 KUBUN2: 選挙関係費のトランザクションを取得
   */
  findElectionExpenseTransactions(
    filters: TransactionFilters,
  ): Promise<ElectionExpenseTransaction[]>;

  /**
   * SYUUSHI07_15 KUBUN3: 機関紙誌の発行事業費のトランザクションを取得
   */
  findPublicationExpenseTransactions(
    filters: TransactionFilters,
  ): Promise<PublicationExpenseTransaction[]>;

  /**
   * SYUUSHI07_15 KUBUN4: 宣伝事業費のトランザクションを取得
   */
  findAdvertisingExpenseTransactions(
    filters: TransactionFilters,
  ): Promise<AdvertisingExpenseTransaction[]>;

  /**
   * SYUUSHI07_15 KUBUN5: 政治資金パーティー開催事業費のトランザクションを取得
   */
  findFundraisingPartyExpenseTransactions(
    filters: TransactionFilters,
  ): Promise<FundraisingPartyExpenseTransaction[]>;

  /**
   * SYUUSHI07_15 KUBUN6: その他の事業費のトランザクションを取得
   */
  findOtherBusinessExpenseTransactions(
    filters: TransactionFilters,
  ): Promise<OtherBusinessExpenseTransaction[]>;

  /**
   * SYUUSHI07_15 KUBUN7: 調査研究費のトランザクションを取得
   */
  findResearchExpenseTransactions(
    filters: TransactionFilters,
  ): Promise<ResearchExpenseTransaction[]>;

  /**
   * SYUUSHI07_15 KUBUN8: 寄附・交付金のトランザクションを取得
   */
  findDonationGrantExpenseTransactions(
    filters: TransactionFilters,
  ): Promise<DonationGrantExpenseTransaction[]>;

  /**
   * SYUUSHI07_15 KUBUN9: その他の経費のトランザクションを取得
   */
  findOtherPoliticalExpenseTransactions(
    filters: TransactionFilters,
  ): Promise<OtherPoliticalExpenseTransaction[]>;
}

// Re-export for consumers
export type {
  PersonalDonationTransaction,
  BusinessIncomeTransaction,
  GrantIncomeTransaction,
  LoanIncomeTransaction,
  OtherIncomeTransaction,
  UtilityExpenseTransaction,
  SuppliesExpenseTransaction,
  OfficeExpenseTransaction,
  OrganizationExpenseTransaction,
  ElectionExpenseTransaction,
  PublicationExpenseTransaction,
  AdvertisingExpenseTransaction,
  FundraisingPartyExpenseTransaction,
  OtherBusinessExpenseTransaction,
  ResearchExpenseTransaction,
  DonationGrantExpenseTransaction,
  OtherPoliticalExpenseTransaction,
};
