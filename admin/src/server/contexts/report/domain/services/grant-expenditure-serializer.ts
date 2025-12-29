/**
 * Grant Expenditure Serializer
 *
 * Serializes GrantExpenditureSection to XML for SYUUSHI07_16 (本部又は支部に対する交付金の支出).
 */
import "server-only";

import { fragment } from "xmlbuilder2";
import type { GrantExpenditureSection } from "@/server/contexts/report/domain/models/grant-expenditure";
import {
  formatAmount,
  formatWarekiDate,
} from "@/server/contexts/report/domain/services/serializer-utils";

/**
 * SYUUSHI07_16のXMLフラグメントを生成する
 */
export function serializeGrantExpenditure(
  section: GrantExpenditureSection,
): ReturnType<typeof fragment> {
  const frag = fragment();
  const root = frag.ele("SYUUSHI07_16");
  const sheet = root.ele("SHEET");

  // 総額
  sheet.ele("KINGAKU_GK").txt(formatAmount(section.totalAmount));

  // 明細行
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
