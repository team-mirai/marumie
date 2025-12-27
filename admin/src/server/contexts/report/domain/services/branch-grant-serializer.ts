/**
 * Branch Grant Serializer
 *
 * Serializes BranchGrantExpenseSection to XML for SYUUSHI07_16 (本部又は支部に対する交付金の支出).
 */
import "server-only";

import { fragment } from "xmlbuilder2";
import type { BranchGrantExpenseSection } from "@/server/contexts/report/domain/models/expense-transaction";
import {
  formatAmount,
  formatWarekiDate,
} from "@/server/contexts/report/domain/services/serializer-utils";

/**
 * SYUUSHI07_16のXMLフラグメントを生成する
 */
export function serializeBranchGrantExpenses(
  section: BranchGrantExpenseSection,
): ReturnType<typeof fragment> {
  const frag = fragment();
  const syuushi = frag.ele("SYUUSHI07_16");
  const sheet = syuushi.ele("SHEET");

  sheet.ele("KINGAKU_GK").txt(formatAmount(section.totalAmount));

  for (const row of section.rows) {
    const rowEle = sheet.ele("ROW");
    rowEle.ele("ICHIREN_NO").txt(row.ichirenNo);
    rowEle.ele("SHISYUTU_KMK").txt(row.shisyutuKmk);
    rowEle.ele("KINGAKU").txt(formatAmount(row.kingaku));
    rowEle.ele("DT").txt(formatWarekiDate(row.dt));
    rowEle.ele("HONSIBU_NM").txt(row.honsibuNm);
    rowEle.ele("JIMU_ADR").txt(row.jimuAdr);

    if (row.bikou) {
      rowEle.ele("BIKOU").txt(row.bikou);
    } else {
      rowEle.ele("BIKOU");
    }
  }

  return frag;
}
