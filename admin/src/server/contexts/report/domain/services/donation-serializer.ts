/**
 * Donation Serializer
 *
 * Serializes donation-related domain objects into XML format.
 * This layer is responsible only for XML generation, not data transformation.
 */

import { fragment } from "xmlbuilder2";
import type { XMLBuilder } from "xmlbuilder2/lib/interfaces";
import type { PersonalDonationSection } from "@/server/contexts/report/domain/models/donation-converter";
import {
  formatAmount,
  formatWarekiDate,
} from "@/server/contexts/report/domain/services/serializer-utils";

// ============================================================
// Serializer Functions
// ============================================================

/**
 * Serializes a PersonalDonationSection into XML format for SYUUSHI07_07 KUBUN1.
 */
export function serializePersonalDonationSection(
  section: PersonalDonationSection,
): XMLBuilder {
  const frag = fragment();
  const root = frag.ele("SYUUSHI07_07");
  const kubun1 = root.ele("KUBUN1");
  const sheet = kubun1.ele("SHEET");

  sheet.ele("KINGAKU_GK").txt(formatAmount(section.totalAmount));

  if (section.sonotaGk > 0) {
    sheet.ele("SONOTA_GK").txt(formatAmount(section.sonotaGk));
  } else {
    sheet.ele("SONOTA_GK");
  }

  for (const row of section.rows) {
    const rowEle = sheet.ele("ROW");
    rowEle.ele("ICHIREN_NO").txt(row.ichirenNo);
    rowEle.ele("KIFUSYA_NM").txt(row.kifusyaNm);
    rowEle.ele("KINGAKU").txt(formatAmount(row.kingaku));
    rowEle.ele("DT").txt(formatWarekiDate(row.dt));
    rowEle.ele("ADR").txt(row.adr);
    rowEle.ele("SYOKUGYO").txt(row.syokugyo);

    if (row.bikou) {
      rowEle.ele("BIKOU").txt(row.bikou);
    } else {
      rowEle.ele("BIKOU");
    }

    if (row.seqNo) {
      rowEle.ele("SEQ_NO").txt(row.seqNo);
    } else {
      rowEle.ele("SEQ_NO");
    }

    rowEle.ele("ZEIGAKUKOUJYO").txt(row.zeigakukoujyo);
    rowEle.ele("ROWKBN").txt(row.rowkbn);
  }

  return frag;
}
