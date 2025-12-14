/**
 * ReportData
 *
 * Aggregated data structure that holds all sections of the political fund report.
 * Organized by semantic groupings for assembler clarity.
 */

import type { PersonalDonationSection } from "@/server/contexts/report/domain/models/donation-transaction";
import type {
  AdvertisingExpenseSection,
  DonationGrantExpenseSection,
  ElectionExpenseSection,
  FundraisingPartyExpenseSection,
  OfficeExpenseSection,
  OrganizationExpenseSection,
  OtherBusinessExpenseSection,
  OtherPoliticalExpenseSection,
  PublicationExpenseSection,
  ResearchExpenseSection,
  SuppliesExpenseSection,
  UtilityExpenseSection,
} from "@/server/contexts/report/domain/models/expense-transaction";
import {
  AdvertisingExpenseSection as AdvertisingExpenseSectionModel,
  DonationGrantExpenseSection as DonationGrantExpenseSectionModel,
  ElectionExpenseSection as ElectionExpenseSectionModel,
  FundraisingPartyExpenseSection as FundraisingPartyExpenseSectionModel,
  OfficeExpenseSection as OfficeExpenseSectionModel,
  OrganizationExpenseSection as OrganizationExpenseSectionModel,
  OtherBusinessExpenseSection as OtherBusinessExpenseSectionModel,
  OtherPoliticalExpenseSection as OtherPoliticalExpenseSectionModel,
  PublicationExpenseSection as PublicationExpenseSectionModel,
  ResearchExpenseSection as ResearchExpenseSectionModel,
  SuppliesExpenseSection as SuppliesExpenseSectionModel,
  UtilityExpenseSection as UtilityExpenseSectionModel,
} from "@/server/contexts/report/domain/models/expense-transaction";
import type {
  BusinessIncomeSection,
  GrantIncomeSection,
  LoanIncomeSection,
  OtherIncomeSection,
} from "@/server/contexts/report/domain/models/income-transaction";
import type { OrganizationReportProfile } from "@/server/contexts/report/domain/models/organization-report-profile";

/**
 * 寄付データ (SYUUSHI07_07)
 */
export interface DonationData {
  personalDonations: PersonalDonationSection; // KUBUN1: 個人からの寄附
  // corporateDonations: CorporateDonationSection;  // KUBUN2: 法人その他の団体からの寄附
  // politicalDonations: PoliticalDonationSection;  // KUBUN3: 政治団体からの寄附
}

/**
 * 収入データ (SYUUSHI07_03 ~ SYUUSHI07_06)
 */
export interface IncomeData {
  businessIncome: BusinessIncomeSection; // SYUUSHI07_03: 事業による収入
  loanIncome: LoanIncomeSection; // SYUUSHI07_04: 借入金
  grantIncome: GrantIncomeSection; // SYUUSHI07_05: 本部又は支部から供与された交付金
  otherIncome: OtherIncomeSection; // SYUUSHI07_06: その他の収入
}

/**
 * 支出データ (SYUUSHI07_14, SYUUSHI07_15)
 */
export interface ExpenseData {
  // SYUUSHI07_14: 経常経費
  utilityExpenses: UtilityExpenseSection; // KUBUN1: 光熱水費
  suppliesExpenses: SuppliesExpenseSection; // KUBUN2: 備品・消耗品費
  officeExpenses: OfficeExpenseSection; // KUBUN3: 事務所費

  // SYUUSHI07_15: 政治活動費（全9区分）
  organizationExpenses: OrganizationExpenseSection; // KUBUN1: 組織活動費
  electionExpenses: ElectionExpenseSection; // KUBUN2: 選挙関係費
  publicationExpenses: PublicationExpenseSection; // KUBUN3: 機関紙誌の発行事業費
  advertisingExpenses: AdvertisingExpenseSection; // KUBUN4: 宣伝事業費
  fundraisingPartyExpenses: FundraisingPartyExpenseSection; // KUBUN5: 政治資金パーティー開催事業費
  otherBusinessExpenses: OtherBusinessExpenseSection; // KUBUN6: その他の事業費
  researchExpenses: ResearchExpenseSection; // KUBUN7: 調査研究費
  donationGrantExpenses: DonationGrantExpenseSection; // KUBUN8: 寄附・交付金
  otherPoliticalExpenses: OtherPoliticalExpenseSection; // KUBUN9: その他の経費
}

/**
 * ExpenseData のドメインロジック
 */
export const ExpenseData = {
  /**
   * 経常経費シート (SYUUSHI07_14) を出力すべきかどうかを判定
   * 光熱水費・備品消耗品費・事務所費のいずれかにデータがあれば出力
   */
  shouldOutputRegularExpenseSheet(data: ExpenseData): boolean {
    return (
      UtilityExpenseSectionModel.shouldOutputSheet(data.utilityExpenses) ||
      SuppliesExpenseSectionModel.shouldOutputSheet(data.suppliesExpenses) ||
      OfficeExpenseSectionModel.shouldOutputSheet(data.officeExpenses)
    );
  },

  /**
   * 政治活動費シート (SYUUSHI07_15) を出力すべきかどうかを判定
   * KUBUN1〜KUBUN9のいずれかにデータがあれば出力
   */
  shouldOutputPoliticalActivitySheet(data: ExpenseData): boolean {
    return (
      OrganizationExpenseSectionModel.shouldOutputSheet(
        data.organizationExpenses,
      ) ||
      ElectionExpenseSectionModel.shouldOutputSheet(data.electionExpenses) ||
      PublicationExpenseSectionModel.shouldOutputSheet(
        data.publicationExpenses,
      ) ||
      AdvertisingExpenseSectionModel.shouldOutputSheet(
        data.advertisingExpenses,
      ) ||
      FundraisingPartyExpenseSectionModel.shouldOutputSheet(
        data.fundraisingPartyExpenses,
      ) ||
      OtherBusinessExpenseSectionModel.shouldOutputSheet(
        data.otherBusinessExpenses,
      ) ||
      ResearchExpenseSectionModel.shouldOutputSheet(data.researchExpenses) ||
      DonationGrantExpenseSectionModel.shouldOutputSheet(
        data.donationGrantExpenses,
      ) ||
      OtherPoliticalExpenseSectionModel.shouldOutputSheet(
        data.otherPoliticalExpenses,
      )
    );
  },
};

/**
 * ReportData holds all section data for generating the full XML report.
 */
export interface ReportData {
  profile: OrganizationReportProfile; // SYUUSHI07_01: 団体プロフィール
  donations: DonationData;
  income: IncomeData;
  expenses: ExpenseData;

  // 資産の部 (SYUUSHI07_17 ~ SYUUSHI07_20)
  // land: LandSection;           // SYUUSHI07_17: 土地
  // buildings: BuildingSection;  // SYUUSHI07_18: 建物
  // movables: MovableSection;    // SYUUSHI07_19: 動産(船舶、航空機、自動車、事務機器等)
  // deposits: DepositSection;    // SYUUSHI07_20: 預金等

  // その他
  // assetStatus: AssetStatusSection;       // SYUUSHI08: 資産等の状況
  // liabilityStatus: LiabilityStatusSection; // SYUUSHI08_02: 負債の状況
  // donationDeduction: DonationDeductionSection; // SYUUSHI_KIFUKOUJYO: 寄附控除
}
