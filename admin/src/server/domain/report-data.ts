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
 * 経常経費データ (SYUUSHI07_14)
 */
export interface ExpenseData {
  // personnelExpenses?: PersonnelExpenseSection;     // SYUUSHI07_07: 人件費
  utilityExpenses: UtilityExpenseSection; // SYUUSHI07_14 KUBUN1: 光熱水費
  suppliesExpenses: SuppliesExpenseSection; // SYUUSHI07_14 KUBUN2: 備品・消耗品費
  officeExpenses: OfficeExpenseSection; // SYUUSHI07_14 KUBUN3: 事務所費
  // organizationExpenses?: OrganizationExpenseSection; // SYUUSHI07_11: 組織活動費
  // electionExpenses?: ElectionExpenseSection;       // SYUUSHI07_12: 選挙関係費
  // publicationExpenses?: PublicationExpenseSection; // SYUUSHI07_13: 機関紙誌の発行その他の事業費
  // researchExpenses?: ResearchExpenseSection;       // (調査研究費は経常経費に含まれない)
  // donationExpenses?: DonationExpenseSection;       // SYUUSHI07_15: 寄附・交付金
  // otherExpenses?: OtherExpenseSection;             // SYUUSHI07_16: その他の経常経費
}

/**
 * ReportData holds all section data for generating the full XML report.
 */
export interface ReportData {
  donations: DonationData;
  income: IncomeData;
  expenses: ExpenseData;

  // 資産の部 (SYUUSHI07_17 ~ SYUUSHI07_20)
  // land?: LandSection;           // SYUUSHI07_17: 土地
  // buildings?: BuildingSection;  // SYUUSHI07_18: 建物
  // movables?: MovableSection;    // SYUUSHI07_19: 動産(船舶、航空機、自動車、事務機器等)
  // deposits?: DepositSection;    // SYUUSHI07_20: 預金等

  // その他
  // assetStatus?: AssetStatusSection;       // SYUUSHI08: 資産等の状況
  // liabilityStatus?: LiabilityStatusSection; // SYUUSHI08_02: 負債の状況
  // donationDeduction?: DonationDeductionSection; // SYUUSHI_KIFUKOUJYO: 寄附控除
}
