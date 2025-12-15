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

  // KUBUN1: 光熱水費
  const kubun1 = root.ele("KUBUN1");
  serializeExpenseKubun(kubun1, utilitySection);

  // KUBUN2: 備品・消耗品費
  const kubun2 = root.ele("KUBUN2");
  serializeExpenseKubun(kubun2, suppliesSection);

  // KUBUN3: 事務所費
  const kubun3 = root.ele("KUBUN3");
  serializeExpenseKubun(kubun3, officeSection);

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
  }
}

/**
 * 政治活動費セクション（SYUUSHI07_15）のシリアライズ用入力型
 */
export interface PoliticalActivityExpenseSections {
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
 * Serializes political activity expense sections into XML format for SYUUSHI07_15.
 * Handles all 9 KUBUN sections (組織活動費〜その他の経費).
 */
export function serializePoliticalActivityExpenseSection(
  sections: PoliticalActivityExpenseSections,
): XMLBuilder {
  const frag = fragment();
  const root = frag.ele("SYUUSHI07_15");

  // KUBUN1: 組織活動費
  const kubun1 = root.ele("KUBUN1");
  serializePoliticalActivityKubun(kubun1, sections.organizationExpenses);

  // KUBUN2: 選挙関係費
  const kubun2 = root.ele("KUBUN2");
  serializePoliticalActivityKubun(kubun2, sections.electionExpenses);

  // KUBUN3: 機関紙誌の発行事業費
  const kubun3 = root.ele("KUBUN3");
  serializePoliticalActivityKubun(kubun3, sections.publicationExpenses);

  // KUBUN4: 宣伝事業費
  const kubun4 = root.ele("KUBUN4");
  serializePoliticalActivityKubun(kubun4, sections.advertisingExpenses);

  // KUBUN5: 政治資金パーティー開催事業費
  const kubun5 = root.ele("KUBUN5");
  serializePoliticalActivityKubun(kubun5, sections.fundraisingPartyExpenses);

  // KUBUN6: その他の事業費
  const kubun6 = root.ele("KUBUN6");
  serializePoliticalActivityKubun(kubun6, sections.otherBusinessExpenses);

  // KUBUN7: 調査研究費
  const kubun7 = root.ele("KUBUN7");
  serializePoliticalActivityKubun(kubun7, sections.researchExpenses);

  // KUBUN8: 寄附・交付金
  const kubun8 = root.ele("KUBUN8");
  serializePoliticalActivityKubun(kubun8, sections.donationGrantExpenses);

  // KUBUN9: その他の経費
  const kubun9 = root.ele("KUBUN9");
  serializePoliticalActivityKubun(kubun9, sections.otherPoliticalExpenses);

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
 * Helper function to serialize a single KUBUN section for SYUUSHI07_15
 */
function serializePoliticalActivityKubun(
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
  }
}
