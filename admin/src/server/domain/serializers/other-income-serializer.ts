/**
 * Other Income Serializer
 *
 * Serializes the OtherIncomeSection domain object into XML format.
 * This layer is responsible only for XML generation, not data transformation.
 */

import { fragment } from "xmlbuilder2";
import type { XMLBuilder } from "xmlbuilder2/lib/interfaces";
import type { OtherIncomeSection } from "../converters/other-income-converter";

// ============================================================
// Serializer Function
// ============================================================

/**
 * Serializes an OtherIncomeSection into XML format for SYUUSHI07_06.
 */
export function serializeOtherIncomeSection(
  section: OtherIncomeSection,
): XMLBuilder {
  const frag = fragment();
  const root = frag.ele("SYUUSHI07_06");
  const sheet = root.ele("SHEET");

  sheet.ele("KINGAKU_GK").txt(formatAmount(section.totalAmount));

  if (section.underThresholdAmount !== null) {
    sheet.ele("MIMAN_GK").txt(formatAmount(section.underThresholdAmount));
  } else {
    sheet.ele("MIMAN_GK");
  }

  for (const row of section.rows) {
    const rowEle = sheet.ele("ROW");
    rowEle.ele("ICHIREN_NO").txt(row.ichirenNo);
    rowEle.ele("TEKIYOU").txt(row.tekiyou);
    rowEle.ele("KINGAKU").txt(formatAmount(row.kingaku));

    if (row.bikou) {
      rowEle.ele("BIKOU").txt(row.bikou);
    } else {
      rowEle.ele("BIKOU");
    }
  }

  return frag;
}

// ============================================================
// Utilities
// ============================================================

function formatAmount(value: number | null | undefined): string {
  if (!Number.isFinite(value ?? null)) {
    return "0";
  }
  const rounded = Math.round(Number(value));
  return rounded.toString();
}
