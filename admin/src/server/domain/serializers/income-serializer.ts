/**
 * Income Serializer
 *
 * Serializes income-related domain objects into XML format.
 * This layer is responsible only for XML generation, not data transformation.
 */

import { fragment } from "xmlbuilder2";
import type { XMLBuilder } from "xmlbuilder2/lib/interfaces";
import type {
  BusinessIncomeSection,
  OtherIncomeSection,
} from "../converters/income-converter";

// ============================================================
// Serializer Functions
// ============================================================

/**
 * Serializes a BusinessIncomeSection into XML format for SYUUSHI07_03.
 */
export function serializeBusinessIncomeSection(
  section: BusinessIncomeSection,
): XMLBuilder {
  const frag = fragment();
  const root = frag.ele("SYUUSHI07_03");
  const sheet = root.ele("SHEET");

  sheet.ele("KINGAKU_GK").txt(formatAmount(section.totalAmount));

  for (const row of section.rows) {
    const rowEle = sheet.ele("ROW");
    rowEle.ele("ICHIREN_NO").txt(row.ichirenNo);
    rowEle.ele("GIGYOU_SYURUI").txt(row.gigyouSyurui);
    rowEle.ele("KINGAKU").txt(formatAmount(row.kingaku));

    rowEle.ele("BIKOU").txt(row.bikou ?? "");
  }

  return frag;
}

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

  if (section.underThresholdAmount > 0) {
    sheet.ele("MIMAN_GK").txt(formatAmount(section.underThresholdAmount));
  } else {
    sheet.ele("MIMAN_GK");
  }

  for (const row of section.rows) {
    const rowEle = sheet.ele("ROW");
    rowEle.ele("ICHIREN_NO").txt(row.ichirenNo);
    rowEle.ele("TEKIYOU").txt(row.tekiyou);
    rowEle.ele("KINGAKU").txt(formatAmount(row.kingaku));
    rowEle.ele("BIKOU").txt(row.bikou ?? "");
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
