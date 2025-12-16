/**
 * Report Serializer
 *
 * Serializes the complete ReportData into XML format.
 * This is the main entry point for XML generation from domain objects.
 */

import "server-only";

import { create } from "xmlbuilder2";
import type { XMLBuilder } from "xmlbuilder2/lib/interfaces";
import { PersonalDonationSection } from "@/server/contexts/report/domain/models/donation-transaction";
import {
  BusinessIncomeSection,
  GrantIncomeSection,
  LoanIncomeSection,
  OtherIncomeSection,
} from "@/server/contexts/report/domain/models/income-transaction";
import { ExpenseData, type ReportData } from "@/server/contexts/report/domain/models/report-data";
import { serializePersonalDonationSection } from "@/server/contexts/report/domain/services/donation-serializer";
import {
  serializeExpenseSection,
  serializePoliticalActivityExpenseSection,
} from "@/server/contexts/report/domain/services/expense-serializer";
import {
  serializeBusinessIncomeSection,
  serializeGrantIncomeSection,
  serializeLoanIncomeSection,
  serializeOtherIncomeSection,
} from "@/server/contexts/report/domain/services/income-serializer";
import { serializeProfileSection } from "@/server/contexts/report/domain/services/profile-serializer";

// ============================================================
// Constants
// ============================================================

const XML_HEAD = {
  VERSION: "20081001",
  APP: "収支報告書作成ソフト (収支報告書作成ソフト)",
  FILE_FORMAT_NO: "1",
  KOKUJI_APP_FLG: "0",
  CHOUBO_APP_VER: "20081001",
} as const;

// Form IDs in the order they appear in SYUUSHI_UMU flag string
// 第14号様式 (収支報告書)
const KNOWN_FORM_IDS = [
  "SYUUSHI07_01", // 第14号様式（その1）団体の基本情報
  "SYUUSHI07_02", // 第14号様式（その2）収支の総括表
  "SYUUSHI07_03", // 第14号様式（その3）事業による収入
  "SYUUSHI07_04", // 第14号様式（その4）借入金
  "SYUUSHI07_05", // 第14号様式（その5）本部または支部からの交付金
  "SYUUSHI07_06", // 第14号様式（その6）その他の収入
  "SYUUSHI07_07", // 第14号様式（その7）寄附の明細
  "SYUUSHI07_08", // 第14号様式（その8）寄附のあっせん
  "SYUUSHI07_09", // 第14号様式（その9）政党匿名寄附
  "SYUUSHI07_10", // 第14号様式（その10）政治資金パーティーの対価に係る収入
  "SYUUSHI07_11", // 第14号様式（その11）政治資金パーティー対価の支払をした者
  "SYUUSHI07_12", // 第14号様式（その12）政治資金パーティー対価の支払のあっせんをした者
  "SYUUSHI07_13", // 第14号様式（その13）※仕様書には存在しない
  "SYUUSHI07_14", // 第14号様式（その14）経常経費の支出（光熱水費・備品消耗品費・事務所費）
  "SYUUSHI07_15", // 第14号様式（その15）政治活動費の支出
  "SYUUSHI07_16", // 第14号様式（その16）本部または支部に対する交付金の支出
  "SYUUSHI07_17", // 第14号様式（その17）資産等の項目別内訳の有無
  "SYUUSHI07_18", // 第14号様式（その18）資産等の項目別内訳の明細
  "SYUUSHI07_19", // 第14号様式（その19）不動産に関する使用の状況
  "SYUUSHI07_20", // 第14号様式（その20）宣誓書
  "SYUUSHI08", // 第15号様式（訂正等届出書）
  "SYUUSHI08_02", // 第16号様式（解散届出書）
  "SYUUSHI_KIFUKOUJYO", // 寄附を受けた団体の情報（寄附金控除関連）
] as const;

const FLAG_STRING_LENGTH = 51;

export type XmlSectionType = (typeof KNOWN_FORM_IDS)[number];

type XmlSection = {
  formId: XmlSectionType;
  xml: XMLBuilder;
};

// ============================================================
// Main Serializer Function
// ============================================================

/**
 * Serializes ReportData into a complete XML document string.
 */
export function serializeReportData(reportData: ReportData): string {
  const sections: XmlSection[] = [];

  // SYUUSHI07_01: 第14号様式（その1）団体の基本情報
  sections.push({
    formId: "SYUUSHI07_01",
    xml: serializeProfileSection(reportData.profile),
  });

  // SYUUSHI07_07: 第14号様式（その7）寄附の明細
  if (PersonalDonationSection.shouldOutputSheet(reportData.donations.personalDonations)) {
    sections.push({
      formId: "SYUUSHI07_07",
      xml: serializePersonalDonationSection(reportData.donations.personalDonations),
    });
  }

  // SYUUSHI07_03: 第14号様式（その3）事業による収入
  if (BusinessIncomeSection.shouldOutputSheet(reportData.income.businessIncome)) {
    sections.push({
      formId: "SYUUSHI07_03",
      xml: serializeBusinessIncomeSection(reportData.income.businessIncome),
    });
  }

  // SYUUSHI07_04: 第14号様式（その4）借入金
  if (LoanIncomeSection.shouldOutputSheet(reportData.income.loanIncome)) {
    sections.push({
      formId: "SYUUSHI07_04",
      xml: serializeLoanIncomeSection(reportData.income.loanIncome),
    });
  }

  // SYUUSHI07_05: 第14号様式（その5）本部または支部からの交付金
  if (GrantIncomeSection.shouldOutputSheet(reportData.income.grantIncome)) {
    sections.push({
      formId: "SYUUSHI07_05",
      xml: serializeGrantIncomeSection(reportData.income.grantIncome),
    });
  }

  // SYUUSHI07_06: 第14号様式（その6）その他の収入
  if (OtherIncomeSection.shouldOutputSheet(reportData.income.otherIncome)) {
    sections.push({
      formId: "SYUUSHI07_06",
      xml: serializeOtherIncomeSection(reportData.income.otherIncome),
    });
  }

  // SYUUSHI07_14: 第14号様式（その14）経常経費の支出（光熱水費・備品消耗品費・事務所費）
  if (ExpenseData.shouldOutputRegularExpenseSheet(reportData.expenses)) {
    sections.push({
      formId: "SYUUSHI07_14",
      xml: serializeExpenseSection(
        reportData.expenses.utilityExpenses,
        reportData.expenses.suppliesExpenses,
        reportData.expenses.officeExpenses,
      ),
    });
  }

  // SYUUSHI07_15: 第14号様式（その15）政治活動費の支出
  if (ExpenseData.shouldOutputPoliticalActivitySheet(reportData.expenses)) {
    sections.push({
      formId: "SYUUSHI07_15",
      xml: serializePoliticalActivityExpenseSection({
        organizationExpenses: reportData.expenses.organizationExpenses,
        electionExpenses: reportData.expenses.electionExpenses,
        publicationExpenses: reportData.expenses.publicationExpenses,
        advertisingExpenses: reportData.expenses.advertisingExpenses,
        fundraisingPartyExpenses: reportData.expenses.fundraisingPartyExpenses,
        otherBusinessExpenses: reportData.expenses.otherBusinessExpenses,
        researchExpenses: reportData.expenses.researchExpenses,
        donationGrantExpenses: reportData.expenses.donationGrantExpenses,
        otherPoliticalExpenses: reportData.expenses.otherPoliticalExpenses,
      }),
    });
  }

  return buildXmlDocument(sections);
}

// ============================================================
// XML Document Builder
// ============================================================

function buildHeadSection(): XMLBuilder {
  const head = create().ele("HEAD");
  Object.entries(XML_HEAD).forEach(([key, value]) => {
    head.ele(key).txt(value);
  });

  return head;
}

function buildXmlDocument(sections: XmlSection[]): string {
  const doc = create({ version: "1.0", encoding: "Shift_JIS" }).ele("BOOK");

  // Build HEAD section
  const headSection = buildHeadSection();
  doc.import(headSection);

  // Build SYUUSHI_FLG section
  const availableFormIds = sections.map((s) => s.formId);
  const syuushiFlgSection = buildSyuushiFlgSection(availableFormIds);
  doc.import(syuushiFlgSection);

  // Import data sections
  for (const section of sections) {
    doc.import(section.xml);
  }

  return doc.end({ prettyPrint: true, indent: "  " });
}

function buildSyuushiFlgSection(availableFormIds: string[]): XMLBuilder {
  const formSet = new Set(
    availableFormIds.filter((formId) =>
      KNOWN_FORM_IDS.includes(formId as (typeof KNOWN_FORM_IDS)[number]),
    ),
  );

  const flagString = KNOWN_FORM_IDS.map((formId) => (formSet.has(formId) ? "1" : "0"))
    .join("")
    .padEnd(FLAG_STRING_LENGTH, "0")
    .slice(0, FLAG_STRING_LENGTH);

  const frag = create().ele("SYUUSHI_FLG");
  frag.ele("SYUUSHI_UMU_FLG").ele("SYUUSHI_UMU").txt(flagString);

  return frag;
}

// Export constants for testing
export { KNOWN_FORM_IDS, FLAG_STRING_LENGTH };
