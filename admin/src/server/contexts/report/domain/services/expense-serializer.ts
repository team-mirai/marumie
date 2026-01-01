/**
 * Expense Serializer
 *
 * Serializes expense-related domain objects into XML format.
 * This layer is responsible only for XML generation, not data transformation.
 */

import { fragment } from "xmlbuilder2";
import type { XMLBuilder } from "xmlbuilder2/lib/interfaces";
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
  formatAmount,
  formatWarekiDate,
} from "@/server/contexts/report/domain/services/serializer-utils";

// ============================================================
// Serializer Functions
// ============================================================

/**
 * Serializes expense sections into XML format for SYUUSHI07_14.
 * This function handles all three KUBUN sections (utility, supplies, office).
 */
export function serializeExpenseSection(
  utilitySection: UtilityExpenseSection,
  suppliesSection: SuppliesExpenseSection,
  officeSection: OfficeExpenseSection,
): XMLBuilder {
  const frag = fragment();
  const root = frag.ele("SYUUSHI07_14");

  const kubunMappings: Array<{
    tag: string;
    section: UtilityExpenseSection | SuppliesExpenseSection | OfficeExpenseSection;
  }> = [
    { tag: "KUBUN1", section: utilitySection }, // 光熱水費
    { tag: "KUBUN2", section: suppliesSection }, // 備品・消耗品費
    { tag: "KUBUN3", section: officeSection }, // 事務所費
  ];

  for (const { tag, section } of kubunMappings) {
    const kubun = root.ele(tag);
    serializeExpenseKubun(kubun, section);
  }

  return frag;
}

/**
 * Helper function to serialize a single KUBUN section
 */
function serializeExpenseKubun(
  kubunElement: XMLBuilder,
  section: UtilityExpenseSection | SuppliesExpenseSection | OfficeExpenseSection,
): void {
  const sheet = kubunElement.ele("SHEET");

  sheet.ele("KINGAKU_GK").txt(formatAmount(section.totalAmount));

  if (section.underThresholdAmount > 0) {
    sheet.ele("SONOTA_GK").txt(formatAmount(section.underThresholdAmount));
  } else {
    sheet.ele("SONOTA_GK");
  }

  for (const row of section.rows) {
    const rowEle = sheet.ele("ROW");
    rowEle.ele("ICHIREN_NO").txt(row.ichirenNo);
    rowEle.ele("MOKUTEKI").txt(row.mokuteki);
    rowEle.ele("KINGAKU").txt(formatAmount(row.kingaku));
    rowEle.ele("DT").txt(formatWarekiDate(row.dt));
    rowEle.ele("NM").txt(row.nm);
    rowEle.ele("ADR").txt(row.adr);

    if (row.bikou) {
      rowEle.ele("BIKOU").txt(row.bikou);
    } else {
      rowEle.ele("BIKOU");
    }

    if (row.ryousyu !== undefined) {
      rowEle.ele("RYOUSYU").txt(row.ryousyu.toString());
    }

    // 交付金フラグ: 0=通常, 1=交付金に係る支出
    if (row.koufukin !== undefined) {
      rowEle.ele("KOUFUKIN").txt(row.koufukin.toString());
    }
  }
}

/**
 * 政治活動費セクション（SYUUSHI07_15）のシリアライズ用入力型
 * 各KUBUNは費目ごとに複数のSHEETを持つことができる
 */
export interface PoliticalActivityExpenseSections {
  organizationExpenses: OrganizationExpenseSection[]; // KUBUN1: 組織活動費
  electionExpenses: ElectionExpenseSection[]; // KUBUN2: 選挙関係費
  publicationExpenses: PublicationExpenseSection[]; // KUBUN3: 機関紙誌の発行事業費
  advertisingExpenses: AdvertisingExpenseSection[]; // KUBUN4: 宣伝事業費
  fundraisingPartyExpenses: FundraisingPartyExpenseSection[]; // KUBUN5: 政治資金パーティー開催事業費
  otherBusinessExpenses: OtherBusinessExpenseSection[]; // KUBUN6: その他の事業費
  researchExpenses: ResearchExpenseSection[]; // KUBUN7: 調査研究費
  donationGrantExpenses: DonationGrantExpenseSection[]; // KUBUN8: 寄附・交付金
  otherPoliticalExpenses: OtherPoliticalExpenseSection[]; // KUBUN9: その他の経費
}

/**
 * Serializes political activity expense sections into XML format for SYUUSHI07_15.
 * Handles all 9 KUBUN sections (組織活動費〜その他の経費).
 * 各KUBUNは費目ごとに複数のSHEETを持つことができる。
 */
export function serializePoliticalActivityExpenseSection(
  sections: PoliticalActivityExpenseSections,
): XMLBuilder {
  const frag = fragment();
  const root = frag.ele("SYUUSHI07_15");

  const kubunMappings: Array<{
    tag: string;
    sectionList: PoliticalActivitySection[];
  }> = [
    { tag: "KUBUN1", sectionList: sections.organizationExpenses }, // 組織活動費
    { tag: "KUBUN2", sectionList: sections.electionExpenses }, // 選挙関係費
    { tag: "KUBUN3", sectionList: sections.publicationExpenses }, // 機関紙誌の発行事業費
    { tag: "KUBUN4", sectionList: sections.advertisingExpenses }, // 宣伝事業費
    { tag: "KUBUN5", sectionList: sections.fundraisingPartyExpenses }, // 政治資金パーティー開催事業費
    { tag: "KUBUN6", sectionList: sections.otherBusinessExpenses }, // その他の事業費
    { tag: "KUBUN7", sectionList: sections.researchExpenses }, // 調査研究費
    { tag: "KUBUN8", sectionList: sections.donationGrantExpenses }, // 寄附・交付金
    { tag: "KUBUN9", sectionList: sections.otherPoliticalExpenses }, // その他の経費
  ];

  for (const { tag, sectionList } of kubunMappings) {
    const kubun = root.ele(tag);
    serializePoliticalActivityKubunSections(kubun, sectionList);
  }

  return frag;
}

/**
 * 政治活動費の各区分セクションの共通型
 */
type PoliticalActivitySection =
  | OrganizationExpenseSection
  | ElectionExpenseSection
  | PublicationExpenseSection
  | AdvertisingExpenseSection
  | FundraisingPartyExpenseSection
  | OtherBusinessExpenseSection
  | ResearchExpenseSection
  | DonationGrantExpenseSection
  | OtherPoliticalExpenseSection;

/**
 * Helper function to serialize multiple SHEET elements for a single KUBUN in SYUUSHI07_15
 * 費目ごとに複数のSHEETを出力する
 */
function serializePoliticalActivityKubunSections(
  kubunElement: XMLBuilder,
  sectionList: PoliticalActivitySection[],
): void {
  // セクションが空の場合は空のSHEETを1つ出力
  if (sectionList.length === 0) {
    serializePoliticalActivitySheet(kubunElement, {
      himoku: "",
      totalAmount: 0,
      underThresholdAmount: 0,
      rows: [],
    });
    return;
  }

  // 各セクションに対してSHEETを出力
  for (const section of sectionList) {
    serializePoliticalActivitySheet(kubunElement, section);
  }
}

/**
 * Helper function to serialize a single SHEET element for SYUUSHI07_15
 */
function serializePoliticalActivitySheet(
  kubunElement: XMLBuilder,
  section: PoliticalActivitySection,
): void {
  const sheet = kubunElement.ele("SHEET");

  // 費目（シート単位）
  if (section.himoku) {
    sheet.ele("HIMOKU").txt(section.himoku);
  } else {
    sheet.ele("HIMOKU");
  }

  sheet.ele("KINGAKU_GK").txt(formatAmount(section.totalAmount));

  if (section.underThresholdAmount > 0) {
    sheet.ele("SONOTA_GK").txt(formatAmount(section.underThresholdAmount));
  } else {
    sheet.ele("SONOTA_GK");
  }

  for (const row of section.rows) {
    const rowEle = sheet.ele("ROW");
    rowEle.ele("ICHIREN_NO").txt(row.ichirenNo);
    rowEle.ele("MOKUTEKI").txt(row.mokuteki);
    rowEle.ele("KINGAKU").txt(formatAmount(row.kingaku));
    rowEle.ele("DT").txt(formatWarekiDate(row.dt));
    rowEle.ele("NM").txt(row.nm);
    rowEle.ele("ADR").txt(row.adr);

    if (row.bikou) {
      rowEle.ele("BIKOU").txt(row.bikou);
    } else {
      rowEle.ele("BIKOU");
    }

    if (row.ryousyu !== undefined) {
      rowEle.ele("RYOUSYU").txt(row.ryousyu.toString());
    }

    // 交付金フラグ: 0=通常, 1=交付金に係る支出
    if (row.koufukin !== undefined) {
      rowEle.ele("KOUFUKIN").txt(row.koufukin.toString());
    }
  }
}
