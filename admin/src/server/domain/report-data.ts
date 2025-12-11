/**
 * ReportData
 *
 * Aggregated data structure that holds all sections of the political fund report.
 * This is the intermediate representation built by the usecase/assemblers
 * and consumed by the serializers for XML output.
 *
 * Organized by semantic groupings:
 * - 寄付 (Donations)
 * - 収入（寄付以外）(Income other than donations)
 * - 支出 (Expenses)
 */

import type { OtherIncomeSection } from "./converters/income-converter";

// ============================================================
// Grouped Data Structures
// ============================================================

/**
 * 寄付データ (Donation Data)
 * SYUUSHI07_01 ~ SYUUSHI07_03
 */
export interface DonationData {
  // SYUUSHI07_01: 個人からの寄附 (future)
  // personalDonations?: PersonalDonationSection;
  // SYUUSHI07_02: 法人その他の団体からの寄附 (future)
  // corporateDonations?: CorporateDonationSection;
  // SYUUSHI07_03: 政治団体からの寄附 (future)
  // politicalDonations?: PoliticalDonationSection;
}

/**
 * 収入データ（寄付以外）(Income Data - excluding donations)
 * SYUUSHI07_04 ~ SYUUSHI07_06
 */
export interface IncomeData {
  // SYUUSHI07_04: 政治資金パーティー開催事業の収入 (future)
  // partyRevenue?: PartyRevenueSection;

  // SYUUSHI07_05: 本部または支部からの交付金 (future)
  // headquartersGrant?: HeadquartersGrantSection;

  // SYUUSHI07_06: その他の収入
  otherIncome?: OtherIncomeSection;
}

/**
 * 支出データ (Expense Data)
 * SYUUSHI07_07 ~ SYUUSHI07_16
 */
export interface ExpenseData {
  // SYUUSHI07_07: 人件費 (future)
  // personnelExpenses?: PersonnelExpenseSection;
  // SYUUSHI07_08: 光熱水費 (future)
  // utilityExpenses?: UtilityExpenseSection;
  // SYUUSHI07_09: 備品・消耗品費 (future)
  // suppliesExpenses?: SuppliesExpenseSection;
  // SYUUSHI07_10: 事務所費 (future)
  // officeExpenses?: OfficeExpenseSection;
  // SYUUSHI07_11: 組織活動費 (future)
  // organizationExpenses?: OrganizationExpenseSection;
  // SYUUSHI07_12: 選挙関係費 (future)
  // electionExpenses?: ElectionExpenseSection;
  // SYUUSHI07_13: 機関紙誌の発行その他の事業費 (future)
  // publicationExpenses?: PublicationExpenseSection;
  // SYUUSHI07_14: 調査研究費 (future)
  // researchExpenses?: ResearchExpenseSection;
  // SYUUSHI07_15: 寄附・交付金 (future)
  // donationExpenses?: DonationExpenseSection;
  // SYUUSHI07_16: その他の経常経費 (future)
  // otherExpenses?: OtherExpenseSection;
}

// ============================================================
// ReportData Interface
// ============================================================

/**
 * ReportData holds all the section data for generating the full XML report.
 * Organized by semantic groupings for better maintainability.
 *
 * All groups are optional because a report may only include specific sections.
 */
export interface ReportData {
  // 寄付 (Donations) - SYUUSHI07_01 ~ SYUUSHI07_03
  donations?: DonationData;

  // 収入（寄付以外）(Income) - SYUUSHI07_04 ~ SYUUSHI07_06
  income?: IncomeData;

  // 支出 (Expenses) - SYUUSHI07_07 ~ SYUUSHI07_16
  expenses?: ExpenseData;

  // 資産の部 (future)
  // SYUUSHI07_17: 土地
  // SYUUSHI07_18: 建物
  // SYUUSHI07_19: 動産
  // SYUUSHI07_20: 預金等

  // その他 (future)
  // SYUUSHI08: 資産等の状況
  // SYUUSHI08_02: 負債の状況
  // SYUUSHI_KIFUKOUJYO: 寄附控除
}

// ============================================================
// Factory / Builder
// ============================================================

/**
 * Creates an empty ReportData object with initialized groups.
 */
export function createEmptyReportData(): ReportData {
  return {
    donations: {},
    income: {},
    expenses: {},
  };
}
