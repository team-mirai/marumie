/**
 * ReportData
 *
 * Aggregated data structure that holds all sections of the political fund report.
 * Organized by semantic groupings for assembler clarity.
 */

import {
  type PersonalDonationSection,
  PersonalDonationSection as PersonalDonationSectionModel,
} from "@/server/contexts/report/domain/models/donation-transaction";
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
import {
  type BusinessIncomeSection,
  BusinessIncomeSection as BusinessIncomeSectionModel,
  type GrantIncomeSection,
  GrantIncomeSection as GrantIncomeSectionModel,
  type LoanIncomeSection,
  LoanIncomeSection as LoanIncomeSectionModel,
  type OtherIncomeSection,
  OtherIncomeSection as OtherIncomeSectionModel,
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
      OrganizationExpenseSectionModel.shouldOutputSheet(data.organizationExpenses) ||
      ElectionExpenseSectionModel.shouldOutputSheet(data.electionExpenses) ||
      PublicationExpenseSectionModel.shouldOutputSheet(data.publicationExpenses) ||
      AdvertisingExpenseSectionModel.shouldOutputSheet(data.advertisingExpenses) ||
      FundraisingPartyExpenseSectionModel.shouldOutputSheet(data.fundraisingPartyExpenses) ||
      OtherBusinessExpenseSectionModel.shouldOutputSheet(data.otherBusinessExpenses) ||
      ResearchExpenseSectionModel.shouldOutputSheet(data.researchExpenses) ||
      DonationGrantExpenseSectionModel.shouldOutputSheet(data.donationGrantExpenses) ||
      OtherPoliticalExpenseSectionModel.shouldOutputSheet(data.otherPoliticalExpenses)
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

/**
 * ReportData に関連するドメインロジック
 */
export const ReportData = {
  /**
   * SYUUSHI_UMU_FLG の51桁フラグ文字列を生成する
   *
   * 各桁は以下の様式のデータ有無を表す（0: 無, 1: 有）:
   * 01: その1, 02: その2, 03: その3, 04: その4, 05: その5, 06: その6,
   * 07: その7 1.個人, 08: その7 2.法人, 09: その7 3.政治団体,
   * 10: その8 1.個人, 11: その8 2.法人, 12: その8 3.政治団体,
   * 13: その9, 14: その10,
   * 15: その11 1.個人, 16: その11 2.法人, 17: その11 3.政治団体,
   * 18: その12 1.個人, 19: その12 2.法人, 20: その12 3.政治団体,
   * 21: その13,
   * 22: その14 2.光熱水費, 23: その14 3.備品・消耗品費, 24: その14 4.事務所費,
   * 25: その15 1.組織活動費, 26: その15 2.選挙関係費, 27: その15 3.機関紙誌の発行事業費,
   * 28: その15 4.宣伝事業費, 29: その15 5.政治資金パーティー開催事業費, 30: その15 6.その他の事業費,
   * 31: その15 7.調査研究費, 32: その15 8.寄附・交付金, 33: その15 9.その他の経費,
   * 34: その16, 35: その17,
   * 36-47: その18 01-12,
   * 48: その19, 49: その20, 50: 第15号, 51: 予備
   */
  buildSyuushiUmuFlg(data: ReportData): string {
    const flags: boolean[] = [
      // 01: その1（団体基本情報）- 必ず存在
      true,
      // 02: その2（収支の総括表）- 未実装
      false,
      // 03: その3（事業による収入）
      BusinessIncomeSectionModel.shouldOutputSheet(data.income.businessIncome),
      // 04: その4（借入金）
      LoanIncomeSectionModel.shouldOutputSheet(data.income.loanIncome),
      // 05: その5（本部又は支部からの交付金）
      GrantIncomeSectionModel.shouldOutputSheet(data.income.grantIncome),
      // 06: その6（その他の収入）
      OtherIncomeSectionModel.shouldOutputSheet(data.income.otherIncome),
      // 07: その7 1.個人からの寄附
      PersonalDonationSectionModel.shouldOutputSheet(data.donations.personalDonations),
      // 08: その7 2.法人その他の団体からの寄附 - 未実装
      false,
      // 09: その7 3.政治団体からの寄附 - 未実装
      false,
      // 10: その8 1.個人（寄附のあっせん）- 未実装
      false,
      // 11: その8 2.法人（寄附のあっせん）- 未実装
      false,
      // 12: その8 3.政治団体（寄附のあっせん）- 未実装
      false,
      // 13: その9（政党匿名寄附）- 未実装
      false,
      // 14: その10（政治資金パーティー対価収入）- 未実装
      false,
      // 15: その11 1.個人（パーティー対価支払者）- 未実装
      false,
      // 16: その11 2.法人（パーティー対価支払者）- 未実装
      false,
      // 17: その11 3.政治団体（パーティー対価支払者）- 未実装
      false,
      // 18: その12 1.個人（パーティー対価あっせん）- 未実装
      false,
      // 19: その12 2.法人（パーティー対価あっせん）- 未実装
      false,
      // 20: その12 3.政治団体（パーティー対価あっせん）- 未実装
      false,
      // 21: その13 - 未実装
      false,
      // 22: その14 2.光熱水費
      UtilityExpenseSectionModel.shouldOutputSheet(data.expenses.utilityExpenses),
      // 23: その14 3.備品・消耗品費
      SuppliesExpenseSectionModel.shouldOutputSheet(data.expenses.suppliesExpenses),
      // 24: その14 4.事務所費
      OfficeExpenseSectionModel.shouldOutputSheet(data.expenses.officeExpenses),
      // 25: その15 1.組織活動費
      OrganizationExpenseSectionModel.shouldOutputSheet(data.expenses.organizationExpenses),
      // 26: その15 2.選挙関係費
      ElectionExpenseSectionModel.shouldOutputSheet(data.expenses.electionExpenses),
      // 27: その15 3.機関紙誌の発行事業費
      PublicationExpenseSectionModel.shouldOutputSheet(data.expenses.publicationExpenses),
      // 28: その15 4.宣伝事業費
      AdvertisingExpenseSectionModel.shouldOutputSheet(data.expenses.advertisingExpenses),
      // 29: その15 5.政治資金パーティー開催事業費
      FundraisingPartyExpenseSectionModel.shouldOutputSheet(data.expenses.fundraisingPartyExpenses),
      // 30: その15 6.その他の事業費
      OtherBusinessExpenseSectionModel.shouldOutputSheet(data.expenses.otherBusinessExpenses),
      // 31: その15 7.調査研究費
      ResearchExpenseSectionModel.shouldOutputSheet(data.expenses.researchExpenses),
      // 32: その15 8.寄附・交付金
      DonationGrantExpenseSectionModel.shouldOutputSheet(data.expenses.donationGrantExpenses),
      // 33: その15 9.その他の経費
      OtherPoliticalExpenseSectionModel.shouldOutputSheet(data.expenses.otherPoliticalExpenses),
      // 34: その16（本部・支部への交付金支出）- 未実装
      false,
      // 35: その17（資産等の項目別内訳の有無）- 未実装
      false,
      // 36: その18 01.土地 - 未実装
      false,
      // 37: その18 02.建物 - 未実装
      false,
      // 38: その18 03.借地権 - 未実装
      false,
      // 39: その18 04.動産 - 未実装
      false,
      // 40: その18 05.預金 - 未実装
      false,
      // 41: その18 06.金銭信託 - 未実装
      false,
      // 42: その18 07.有価証券 - 未実装
      false,
      // 43: その18 08.出資による権利 - 未実装
      false,
      // 44: その18 09.貸付金 - 未実装
      false,
      // 45: その18 10.敷金 - 未実装
      false,
      // 46: その18 11.施設利用権 - 未実装
      false,
      // 47: その18 12.借入金 - 未実装
      false,
      // 48: その19（不動産の利用状況）- 未実装
      false,
      // 49: その20（宣誓書）- 未実装
      false,
      // 50: 第15号（領収書等を徴し難かった支出の明細書）- 未実装
      false,
      // 51: 予備
      false,
    ];

    return flags.map((f) => (f ? "1" : "0")).join("");
  },
};
