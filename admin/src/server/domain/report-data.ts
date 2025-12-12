/**
 * ReportData
 *
 * Aggregated data structure that holds all sections of the political fund report.
 * Organized by semantic groupings for assembler clarity.
 */

import type { PersonalDonationSection } from "./converters/donation-converter";
import type {
  OfficeExpenseSection,
  SuppliesExpenseSection,
  UtilityExpenseSection,
} from "./converters/expense-converter";
import type {
  BusinessIncomeSection,
  GrantIncomeSection,
  LoanIncomeSection,
  OtherIncomeSection,
} from "./converters/income-converter";

/**
 * 寄付データ (SYUUSHI07_07)
 */
export interface DonationData {
  personalDonations?: PersonalDonationSection; // KUBUN1: 個人からの寄附
  // corporateDonations?: CorporateDonationSection;  // KUBUN2: 法人その他の団体からの寄附
  // politicalDonations?: PoliticalDonationSection;  // KUBUN3: 政治団体からの寄附
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
 * 支出データ (SYUUSHI07_14 ~ SYUUSHI07_16)
 */
export interface ExpenseData {
  // personnelExpenses?: PersonnelExpenseSection;     // (7) 人件費
  utilityExpenses: UtilityExpenseSection; // (8) 光熱水費
  suppliesExpenses: SuppliesExpenseSection; // (9) 備品・消耗品費
  officeExpenses: OfficeExpenseSection; // (10) 事務所費
  // organizationExpenses?: OrganizationExpenseSection; // (11) 組織活動費
  // electionExpenses?: ElectionExpenseSection;       // (12) 選挙関係費
  // publicationExpenses?: PublicationExpenseSection; // (13) 機関紙誌の発行その他の事業費
  // researchExpenses?: ResearchExpenseSection;       // (14) 調査研究費
  // donationExpenses?: DonationExpenseSection;       // (15) 寄附・交付金
  // otherExpenses?: OtherExpenseSection;             // (16) その他の経常経費
}

/**
 * ReportData holds all section data for generating the full XML report.
 */
export interface ReportData {
  donations: DonationData;
  income: IncomeData;
  expenses: ExpenseData;

  // 資産の部 (SYUUSHI07_17 ~ SYUUSHI07_20)
  // land?: LandSection;           // (17) 土地
  // buildings?: BuildingSection;  // (18) 建物
  // movables?: MovableSection;    // (19) 動産
  // deposits?: DepositSection;    // (20) 預金等

  // その他
  // assetStatus?: AssetStatusSection;       // SYUUSHI08: 資産等の状況
  // liabilityStatus?: LiabilityStatusSection; // SYUUSHI08_02: 負債の状況
  // donationDeduction?: DonationDeductionSection; // SYUUSHI_KIFUKOUJYO: 寄附控除
}
