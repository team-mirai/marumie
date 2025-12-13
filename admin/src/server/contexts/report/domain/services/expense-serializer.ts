/**
 * Expense Serializer
 *
 * Serializes expense-related domain objects into XML format.
 * This layer is responsible only for XML generation, not data transformation.
 */

import { fragment } from "xmlbuilder2";
import type { XMLBuilder } from "xmlbuilder2/lib/interfaces";
import type {
  OfficeExpenseSection,
  SuppliesExpenseSection,
  UtilityExpenseSection,
} from "@/server/contexts/report/domain/services/expense-converter";
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
  section:
    | UtilityExpenseSection
    | SuppliesExpenseSection
    | OfficeExpenseSection,
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
