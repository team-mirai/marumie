/**
 * Report Serializer
 *
 * Serializes the complete ReportData into XML format.
 * This is the main entry point for XML generation from domain objects.
 */

import { create } from "xmlbuilder2";
import type { XMLBuilder } from "xmlbuilder2/lib/interfaces";
import type { ReportData } from "@/server/contexts/report/domain/models/report-data";
import { serializePersonalDonationSection } from "@/server/contexts/report/domain/services/donation-serializer";
import { serializeExpenseSection } from "@/server/contexts/report/domain/services/expense-serializer";
import {
  serializeBusinessIncomeSection,
  serializeGrantIncomeSection,
  serializeLoanIncomeSection,
  serializeOtherIncomeSection,
} from "@/server/contexts/report/domain/services/income-serializer";

// ============================================================
// Types
// ============================================================

interface XmlHead {
  version: string;
  appName: string;
  fileFormatNo: string;
  kokujiAppFlag: string;
  choboAppVersion: string;
}

const DEFAULT_HEAD: XmlHead = {
  version: "20081001",
  appName: "収支報告書作成ソフト (収支報告書作成ソフト)",
  fileFormatNo: "1",
  kokujiAppFlag: "0",
  choboAppVersion: "20081001",
};

// Form IDs in the order they appear in SYUUSHI_UMU flag string
// 第14号様式 (収支報告書)
const KNOWN_FORM_IDS = [
  "SYUUSHI07_01", // (1) 個人からの寄附
  "SYUUSHI07_02", // (2) 法人その他の団体からの寄附
  "SYUUSHI07_03", // (3) 政治団体からの寄附
  "SYUUSHI07_04", // (4) 政治資金パーティー開催事業の収入
  "SYUUSHI07_05", // (5) 本部または支部からの交付金
  "SYUUSHI07_06", // (6) その他の収入
  "SYUUSHI07_07", // (7) 人件費
  "SYUUSHI07_08", // (8) 光熱水費
  "SYUUSHI07_09", // (9) 備品・消耗品費
  "SYUUSHI07_10", // (10) 事務所費
  "SYUUSHI07_11", // (11) 組織活動費
  "SYUUSHI07_12", // (12) 選挙関係費
  "SYUUSHI07_13", // (13) 機関紙誌の発行その他の事業費
  "SYUUSHI07_14", // (14) 調査研究費
  "SYUUSHI07_15", // (15) 寄附・交付金
  "SYUUSHI07_16", // (16) その他の経常経費
  "SYUUSHI07_17", // (17) 土地
  "SYUUSHI07_18", // (18) 建物
  "SYUUSHI07_19", // (19) 動産(船舶、航空機、自動車、事務機器等)
  "SYUUSHI07_20", // (20) 預金等
  "SYUUSHI08", // 第15号様式 (資産等の状況)
  "SYUUSHI08_02", // 第15号様式 (負債の状況)
  "SYUUSHI_KIFUKOUJYO", // 寄附控除
] as const;

const FLAG_STRING_LENGTH = 51;

export type XmlSectionType = (typeof KNOWN_FORM_IDS)[number];

// ============================================================
// Main Serializer Function
// ============================================================

/**
 * Serializes ReportData into a complete XML document string.
 */
export function serializeReportData(
  reportData: ReportData,
  head: Partial<XmlHead> = {},
): string {
  const sections: { formId: XmlSectionType; xml: XMLBuilder }[] = [];

  // SYUUSHI07_07: 寄附 (個人からの寄附)
  if (
    reportData.donations.personalDonations &&
    (reportData.donations.personalDonations.rows.length > 0 ||
      reportData.donations.personalDonations.totalAmount > 0)
  ) {
    sections.push({
      formId: "SYUUSHI07_07",
      xml: serializePersonalDonationSection(
        reportData.donations.personalDonations,
      ),
    });
  }

  // SYUUSHI07_03: 事業による収入
  if (
    reportData.income.businessIncome.rows.length > 0 ||
    reportData.income.businessIncome.totalAmount > 0
  ) {
    sections.push({
      formId: "SYUUSHI07_03",
      xml: serializeBusinessIncomeSection(reportData.income.businessIncome),
    });
  }

  // SYUUSHI07_04: 借入金
  if (
    reportData.income.loanIncome.rows.length > 0 ||
    reportData.income.loanIncome.totalAmount > 0
  ) {
    sections.push({
      formId: "SYUUSHI07_04",
      xml: serializeLoanIncomeSection(reportData.income.loanIncome),
    });
  }

  // SYUUSHI07_05: 本部又は支部から供与された交付金
  if (
    reportData.income.grantIncome.rows.length > 0 ||
    reportData.income.grantIncome.totalAmount > 0
  ) {
    sections.push({
      formId: "SYUUSHI07_05",
      xml: serializeGrantIncomeSection(reportData.income.grantIncome),
    });
  }

  // SYUUSHI07_06: その他の収入
  if (
    reportData.income.otherIncome.rows.length > 0 ||
    reportData.income.otherIncome.totalAmount > 0
  ) {
    sections.push({
      formId: "SYUUSHI07_06",
      xml: serializeOtherIncomeSection(reportData.income.otherIncome),
    });
  }

  // SYUUSHI07_14: 経常経費の支出（光熱水費・備品消耗品費・事務所費）
  const hasExpenseData =
    reportData.expenses.utilityExpenses.rows.length > 0 ||
    reportData.expenses.utilityExpenses.totalAmount > 0 ||
    reportData.expenses.suppliesExpenses.rows.length > 0 ||
    reportData.expenses.suppliesExpenses.totalAmount > 0 ||
    reportData.expenses.officeExpenses.rows.length > 0 ||
    reportData.expenses.officeExpenses.totalAmount > 0;

  if (hasExpenseData) {
    sections.push({
      formId: "SYUUSHI07_14",
      xml: serializeExpenseSection(
        reportData.expenses.utilityExpenses,
        reportData.expenses.suppliesExpenses,
        reportData.expenses.officeExpenses,
      ),
    });
  }

  return buildXmlDocument(
    sections.map((s) => s.xml),
    sections.map((s) => s.formId),
    head,
  );
}

// ============================================================
// XML Document Builder
// ============================================================

function buildXmlDocument(
  sections: XMLBuilder[],
  availableFormIds: XmlSectionType[],
  head: Partial<XmlHead> = {},
): string {
  const resolvedHead: XmlHead = {
    ...DEFAULT_HEAD,
    ...head,
  };

  const doc = create({ version: "1.0", encoding: "Shift_JIS" }).ele("BOOK");

  // Build HEAD section
  doc
    .ele("HEAD")
    .ele("VERSION")
    .txt(resolvedHead.version)
    .up()
    .ele("APP")
    .txt(resolvedHead.appName)
    .up()
    .ele("FILE_FORMAT_NO")
    .txt(resolvedHead.fileFormatNo)
    .up()
    .ele("KOKUJI_APP_FLG")
    .txt(resolvedHead.kokujiAppFlag)
    .up()
    .ele("CHOUBO_APP_VER")
    .txt(resolvedHead.choboAppVersion)
    .up()
    .up();

  // Build SYUUSHI_FLG section
  const syuushiFlgSection = buildSyuushiFlgSection(availableFormIds);
  doc.import(syuushiFlgSection);

  // Import data sections
  for (const section of sections) {
    doc.import(section);
  }

  return doc.end({ prettyPrint: true, indent: "  " });
}

function buildSyuushiFlgSection(availableFormIds: string[]): XMLBuilder {
  const formSet = new Set(
    availableFormIds.filter((formId) =>
      KNOWN_FORM_IDS.includes(formId as (typeof KNOWN_FORM_IDS)[number]),
    ),
  );

  const flagString = KNOWN_FORM_IDS.map((formId) =>
    formSet.has(formId) ? "1" : "0",
  )
    .join("")
    .padEnd(FLAG_STRING_LENGTH, "0")
    .slice(0, FLAG_STRING_LENGTH);

  const frag = create().ele("SYUUSHI_FLG");
  frag.ele("SYUUSHI_UMU_FLG").ele("SYUUSHI_UMU").txt(flagString);

  return frag;
}

// Export constants for testing
export { KNOWN_FORM_IDS, FLAG_STRING_LENGTH };
