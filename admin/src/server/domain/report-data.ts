/**
 * ReportData
 *
 * Aggregated data structure that holds all sections of the political fund report.
 * Organized by semantic groupings for assembler clarity.
 */

import type { PersonalDonationSection } from "./converters/donation-converter";
import type {
  BusinessIncomeSection,
  GrantIncomeSection,
  LoanIncomeSection,
  OtherIncomeSection,
} from "./converters/income-converter";
import type {
  RegularExpenseData,
  PoliticalActivityExpenseData,
  GrantToHeadquartersSection,
} from "./converters/expense-converter";

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
  regularExpenses: RegularExpenseData; // SYUUSHI07_14: 経常経費（光熱水費、備品・消耗品費、事務所費）
  politicalActivityExpenses: PoliticalActivityExpenseData; // SYUUSHI07_15: 政治活動費（9カテゴリ）
  grantToHeadquarters: GrantToHeadquartersSection; // SYUUSHI07_16: 本部又は支部に対する交付金
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
