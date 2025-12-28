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
  ValidationError,
  ValidationResult,
} from "@/server/contexts/report/domain/types/validation";
import type {
  AdvertisingExpenseSection,
  BranchGrantExpenseSection,
  DonationGrantExpenseSection,
  ElectionExpenseSection,
  FundraisingPartyExpenseSection,
  OfficeExpenseSection,
  OrganizationExpenseSection,
  OtherBusinessExpenseSection,
  OtherPoliticalExpenseSection,
  PersonnelExpenseSection,
  PublicationExpenseSection,
  ResearchExpenseSection,
  SuppliesExpenseSection,
  UtilityExpenseSection,
} from "@/server/contexts/report/domain/models/expense-transaction";
import {
  AdvertisingExpenseSection as AdvertisingExpenseSectionModel,
  BranchGrantExpenseSection as BranchGrantExpenseSectionModel,
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
import {
  type OrganizationReportProfile,
  OrganizationReportProfile as OrganizationReportProfileModel,
} from "@/server/contexts/report/domain/models/organization-report-profile";
import type { SummaryData } from "@/server/contexts/report/domain/models/summary-data";

/**
 * 寄付データ (SYUUSHI07_07)
 */
export interface DonationData {
  personalDonations: PersonalDonationSection; // KUBUN1: 個人からの寄附
  // corporateDonations: CorporateDonationSection;  // KUBUN2: 法人その他の団体からの寄附
  // politicalDonations: PoliticalDonationSection;  // KUBUN3: 政治団体からの寄附
}

/**
 * DonationData のドメインロジック
 */
export const DonationData = {
  validate: (data: DonationData): ValidationError[] => {
    const errors: ValidationError[] = [];
    errors.push(...PersonalDonationSectionModel.validate(data.personalDonations));
    return errors;
  },
};

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
 * IncomeData のドメインロジック
 */
export const IncomeData = {
  validate: (data: IncomeData): ValidationError[] => {
    const errors: ValidationError[] = [];
    errors.push(...BusinessIncomeSectionModel.validate(data.businessIncome));
    errors.push(...LoanIncomeSectionModel.validate(data.loanIncome));
    errors.push(...GrantIncomeSectionModel.validate(data.grantIncome));
    errors.push(...OtherIncomeSectionModel.validate(data.otherIncome));
    return errors;
  },
};

/**
 * 支出データ (SYUUSHI07_13, SYUUSHI07_14, SYUUSHI07_15, SYUUSHI07_16)
 */
export interface ExpenseData {
  // SYUUSHI07_13: 人件費（シート14には明細を出力しないが、シート13の総括表に必要）
  personnelExpenses: PersonnelExpenseSection;

  // SYUUSHI07_14: 経常経費
  utilityExpenses: UtilityExpenseSection; // KUBUN1: 光熱水費
  suppliesExpenses: SuppliesExpenseSection; // KUBUN2: 備品・消耗品費
  officeExpenses: OfficeExpenseSection; // KUBUN3: 事務所費

  // SYUUSHI07_15: 政治活動費（全9区分）- 費目ごとに複数のSHEETを持つことができる
  organizationExpenses: OrganizationExpenseSection[]; // KUBUN1: 組織活動費
  electionExpenses: ElectionExpenseSection[]; // KUBUN2: 選挙関係費
  publicationExpenses: PublicationExpenseSection[]; // KUBUN3: 機関紙誌の発行事業費
  advertisingExpenses: AdvertisingExpenseSection[]; // KUBUN4: 宣伝事業費
  fundraisingPartyExpenses: FundraisingPartyExpenseSection[]; // KUBUN5: 政治資金パーティー開催事業費
  otherBusinessExpenses: OtherBusinessExpenseSection[]; // KUBUN6: その他の事業費
  researchExpenses: ResearchExpenseSection[]; // KUBUN7: 調査研究費
  donationGrantExpenses: DonationGrantExpenseSection[]; // KUBUN8: 寄附・交付金
  otherPoliticalExpenses: OtherPoliticalExpenseSection[]; // KUBUN9: その他の経費

  // SYUUSHI07_16: 本部又は支部に対する交付金
  branchGrantExpenses: BranchGrantExpenseSection;
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
      data.organizationExpenses.some((s) => OrganizationExpenseSectionModel.shouldOutputSheet(s)) ||
      data.electionExpenses.some((s) => ElectionExpenseSectionModel.shouldOutputSheet(s)) ||
      data.publicationExpenses.some((s) => PublicationExpenseSectionModel.shouldOutputSheet(s)) ||
      data.advertisingExpenses.some((s) => AdvertisingExpenseSectionModel.shouldOutputSheet(s)) ||
      data.fundraisingPartyExpenses.some((s) =>
        FundraisingPartyExpenseSectionModel.shouldOutputSheet(s),
      ) ||
      data.otherBusinessExpenses.some((s) =>
        OtherBusinessExpenseSectionModel.shouldOutputSheet(s),
      ) ||
      data.researchExpenses.some((s) => ResearchExpenseSectionModel.shouldOutputSheet(s)) ||
      data.donationGrantExpenses.some((s) =>
        DonationGrantExpenseSectionModel.shouldOutputSheet(s),
      ) ||
      data.otherPoliticalExpenses.some((s) =>
        OtherPoliticalExpenseSectionModel.shouldOutputSheet(s),
      )
    );
  },

  validate: (data: ExpenseData): ValidationError[] => {
    const errors: ValidationError[] = [];
    errors.push(...UtilityExpenseSectionModel.validate(data.utilityExpenses));
    errors.push(...SuppliesExpenseSectionModel.validate(data.suppliesExpenses));
    errors.push(...OfficeExpenseSectionModel.validate(data.officeExpenses));
    for (const section of data.organizationExpenses) {
      errors.push(...OrganizationExpenseSectionModel.validate(section));
    }
    for (const section of data.electionExpenses) {
      errors.push(...ElectionExpenseSectionModel.validate(section));
    }
    for (const section of data.publicationExpenses) {
      errors.push(...PublicationExpenseSectionModel.validate(section));
    }
    for (const section of data.advertisingExpenses) {
      errors.push(...AdvertisingExpenseSectionModel.validate(section));
    }
    for (const section of data.fundraisingPartyExpenses) {
      errors.push(...FundraisingPartyExpenseSectionModel.validate(section));
    }
    for (const section of data.otherBusinessExpenses) {
      errors.push(...OtherBusinessExpenseSectionModel.validate(section));
    }
    for (const section of data.researchExpenses) {
      errors.push(...ResearchExpenseSectionModel.validate(section));
    }
    for (const section of data.donationGrantExpenses) {
      errors.push(...DonationGrantExpenseSectionModel.validate(section));
    }
    for (const section of data.otherPoliticalExpenses) {
      errors.push(...OtherPoliticalExpenseSectionModel.validate(section));
    }
    return errors;
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
      // 02: その2（収支の総括表）- 常に出力
      true,
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
      // 21: その13（支出項目別金額の内訳）
      // シート14/15にデータがあるか、人件費があれば出力
      data.expenses.personnelExpenses.totalAmount > 0 ||
        ExpenseData.shouldOutputRegularExpenseSheet(data.expenses) ||
        ExpenseData.shouldOutputPoliticalActivitySheet(data.expenses),
      // 22: その14 2.光熱水費
      UtilityExpenseSectionModel.shouldOutputSheet(data.expenses.utilityExpenses),
      // 23: その14 3.備品・消耗品費
      SuppliesExpenseSectionModel.shouldOutputSheet(data.expenses.suppliesExpenses),
      // 24: その14 4.事務所費
      OfficeExpenseSectionModel.shouldOutputSheet(data.expenses.officeExpenses),
      // 25: その15 1.組織活動費
      data.expenses.organizationExpenses.some((s) =>
        OrganizationExpenseSectionModel.shouldOutputSheet(s),
      ),
      // 26: その15 2.選挙関係費
      data.expenses.electionExpenses.some((s) => ElectionExpenseSectionModel.shouldOutputSheet(s)),
      // 27: その15 3.機関紙誌の発行事業費
      data.expenses.publicationExpenses.some((s) =>
        PublicationExpenseSectionModel.shouldOutputSheet(s),
      ),
      // 28: その15 4.宣伝事業費
      data.expenses.advertisingExpenses.some((s) =>
        AdvertisingExpenseSectionModel.shouldOutputSheet(s),
      ),
      // 29: その15 5.政治資金パーティー開催事業費
      data.expenses.fundraisingPartyExpenses.some((s) =>
        FundraisingPartyExpenseSectionModel.shouldOutputSheet(s),
      ),
      // 30: その15 6.その他の事業費
      data.expenses.otherBusinessExpenses.some((s) =>
        OtherBusinessExpenseSectionModel.shouldOutputSheet(s),
      ),
      // 31: その15 7.調査研究費
      data.expenses.researchExpenses.some((s) => ResearchExpenseSectionModel.shouldOutputSheet(s)),
      // 32: その15 8.寄附・交付金
      data.expenses.donationGrantExpenses.some((s) =>
        DonationGrantExpenseSectionModel.shouldOutputSheet(s),
      ),
      // 33: その15 9.その他の経費
      data.expenses.otherPoliticalExpenses.some((s) =>
        OtherPoliticalExpenseSectionModel.shouldOutputSheet(s),
      ),
      // 34: その16（本部・支部への交付金支出）
      BranchGrantExpenseSectionModel.shouldOutputSheet(data.expenses.branchGrantExpenses),
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

  /**
   * 収支総括表データ (SYUUSHI07_02) を計算して返す
   *
   * 計算式:
   * - 本年収入額 = 寄附合計 + 事業収入 + 借入金 + 交付金 + その他収入
   * - 収入総額 = 前年繰越額 + 本年収入額
   * - 支出総額 = 経常経費 + 政治活動費
   * - 翌年繰越額 = 収入総額 - 支出総額
   * - 寄附小計 = 個人 + 特定 + 法人 + 政治団体
   * - 寄附合計 = 寄附小計 + あっせん + 政党匿名
   */
  getSummary(data: ReportData, previousYearCarryover: number = 0): SummaryData {
    // 個人寄附（SYUUSHI07_07 KUBUN1）
    const kojinKifuGk = Math.round(data.donations.personalDonations.totalAmount);

    // 法人寄附・政治団体寄附（未実装のため0）
    const hojinKifuGk: number | null = null;
    const seijiKifuGk: number | null = null;

    // 特定寄附（スコープ外のため null）
    const tokuteiKifuGk: number | null = null;

    // 寄附小計 = 個人 + 特定 + 法人 + 政治団体
    const kifuSkeiGk = kojinKifuGk + (tokuteiKifuGk ?? 0) + (hojinKifuGk ?? 0) + (seijiKifuGk ?? 0);

    // あっせん・政党匿名寄附（スコープ外のため null）
    const atusenGk: number | null = null;
    const tokumeiKifuGk: number | null = null;

    // 寄附合計 = 寄附小計 + あっせん + 政党匿名
    const kifuGkeiGk = kifuSkeiGk + (atusenGk ?? 0) + (tokumeiKifuGk ?? 0);

    // 収入データ
    const businessIncomeAmount = Math.round(data.income.businessIncome.totalAmount);
    const loanIncomeAmount = Math.round(data.income.loanIncome.totalAmount);
    const grantIncomeAmount = Math.round(data.income.grantIncome.totalAmount);
    const otherIncomeAmount = Math.round(data.income.otherIncome.totalAmount);

    // 本年収入額 = 寄附合計 + 事業収入 + 借入金 + 交付金 + その他収入
    const honnenSyunyuGk =
      kifuGkeiGk + businessIncomeAmount + loanIncomeAmount + grantIncomeAmount + otherIncomeAmount;

    // 前年繰越額
    const zennenKksGk = Math.round(previousYearCarryover);

    // 収入総額 = 前年繰越額 + 本年収入額
    const syunyuSgk = zennenKksGk + honnenSyunyuGk;

    // 経常経費（SYUUSHI07_14）
    const regularExpenseAmount =
      Math.round(data.expenses.utilityExpenses.totalAmount) +
      Math.round(data.expenses.suppliesExpenses.totalAmount) +
      Math.round(data.expenses.officeExpenses.totalAmount);

    // 政治活動費（SYUUSHI07_15）- 各配列の合計を計算
    const politicalActivityExpenseAmount =
      data.expenses.organizationExpenses.reduce((sum, s) => sum + Math.round(s.totalAmount), 0) +
      data.expenses.electionExpenses.reduce((sum, s) => sum + Math.round(s.totalAmount), 0) +
      data.expenses.publicationExpenses.reduce((sum, s) => sum + Math.round(s.totalAmount), 0) +
      data.expenses.advertisingExpenses.reduce((sum, s) => sum + Math.round(s.totalAmount), 0) +
      data.expenses.fundraisingPartyExpenses.reduce(
        (sum, s) => sum + Math.round(s.totalAmount),
        0,
      ) +
      data.expenses.otherBusinessExpenses.reduce((sum, s) => sum + Math.round(s.totalAmount), 0) +
      data.expenses.researchExpenses.reduce((sum, s) => sum + Math.round(s.totalAmount), 0) +
      data.expenses.donationGrantExpenses.reduce((sum, s) => sum + Math.round(s.totalAmount), 0) +
      data.expenses.otherPoliticalExpenses.reduce((sum, s) => sum + Math.round(s.totalAmount), 0);

    // 支出総額 = 経常経費 + 政治活動費
    const sisyutuSgk = regularExpenseAmount + politicalActivityExpenseAmount;

    // 翌年繰越額 = 収入総額 - 支出総額
    const yokunenKksGk = syunyuSgk - sisyutuSgk;

    return {
      syunyuSgk,
      zennenKksGk,
      honnenSyunyuGk,
      sisyutuSgk,
      yokunenKksGk,
      kojinFutanKgk: null, // スコープ外
      kojinFutanSu: null, // スコープ外
      kojinKifuGk,
      kojinKifuBikou: null,
      tokuteiKifuGk,
      tokuteiKifuBikou: null,
      hojinKifuGk,
      hojinKifuBikou: null,
      seijiKifuGk,
      seijiKifuBikou: null,
      kifuSkeiGk,
      kifuSkeiBikou: null,
      atusenGk,
      atusenBikou: null,
      tokumeiKifuGk,
      tokumeiBikou: null,
      kifuGkeiGk,
      kifuGkeiBikou: null,
    };
  },

  validate(data: ReportData): ValidationResult {
    const allErrors: ValidationError[] = [];

    allErrors.push(...OrganizationReportProfileModel.validate(data.profile));
    allErrors.push(...DonationData.validate(data.donations));
    allErrors.push(...IncomeData.validate(data.income));
    allErrors.push(...ExpenseData.validate(data.expenses));

    const errors = allErrors.filter((e) => e.severity === "error");
    const warnings = allErrors.filter((e) => e.severity === "warning");

    return {
      isValid: errors.length === 0,
      errors,
      warnings,
    };
  },
};
