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
  GrantIncomeSection,
  LoanIncomeSection,
  OtherIncomeSection,
} from "@/server/contexts/report/domain/models/income-transaction";
import {
  formatAmount,
  formatWarekiDate,
} from "@/server/contexts/report/domain/services/serializer-utils";

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

    if (row.bikou) {
      rowEle.ele("BIKOU").txt(row.bikou);
    } else {
      rowEle.ele("BIKOU");
    }
  }

  return frag;
}

/**
 * Serializes a LoanIncomeSection into XML format for SYUUSHI07_04.
 */
export function serializeLoanIncomeSection(
  section: LoanIncomeSection,
): XMLBuilder {
  const frag = fragment();
  const root = frag.ele("SYUUSHI07_04");
  const sheet = root.ele("SHEET");

  sheet.ele("KINGAKU_GK").txt(formatAmount(section.totalAmount));

  for (const row of section.rows) {
    const rowEle = sheet.ele("ROW");
    rowEle.ele("ICHIREN_NO").txt(row.ichirenNo);
    rowEle.ele("KARIIRESAKI").txt(row.kariiresaki);
    rowEle.ele("KINGAKU").txt(formatAmount(row.kingaku));

    if (row.bikou) {
      rowEle.ele("BIKOU").txt(row.bikou);
    } else {
      rowEle.ele("BIKOU");
    }
  }

  return frag;
}

/**
 * Serializes a GrantIncomeSection into XML format for SYUUSHI07_05.
 */
export function serializeGrantIncomeSection(
  section: GrantIncomeSection,
): XMLBuilder {
  const frag = fragment();
  const root = frag.ele("SYUUSHI07_05");
  const sheet = root.ele("SHEET");

  sheet.ele("KINGAKU_GK").txt(formatAmount(section.totalAmount));

  for (const row of section.rows) {
    const rowEle = sheet.ele("ROW");
    rowEle.ele("ICHIREN_NO").txt(row.ichirenNo);
    rowEle.ele("HONSIBU_NM").txt(row.honsibuNm);
    rowEle.ele("KINGAKU").txt(formatAmount(row.kingaku));
    rowEle.ele("DT").txt(formatWarekiDate(row.dt));
    rowEle.ele("JIMU_ADR").txt(row.jimuAdr);

    if (row.bikou) {
      rowEle.ele("BIKOU").txt(row.bikou);
    } else {
      rowEle.ele("BIKOU");
    }
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
    if (row.bikou) {
      rowEle.ele("BIKOU").txt(row.bikou);
    } else {
      rowEle.ele("BIKOU");
    }
  }

  return frag;
}
