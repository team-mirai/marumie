/**
 * Expense Serializer
 *
 * Serializes expense-related domain objects into XML format.
 * This layer is responsible only for XML generation, not data transformation.
 */

import { fragment } from "xmlbuilder2";
import type { XMLBuilder } from "xmlbuilder2/lib/interfaces";
import type {
  RegularExpenseData,
  RegularExpenseSection,
  PoliticalActivityExpenseData,
  PoliticalActivityExpenseSection,
  GrantToHeadquartersSection,
} from "../converters/expense-converter";
import { formatAmount, formatWarekiDate } from "./utils";

// ============================================================
// Serializer Functions
// ============================================================

/**
 * Serializes RegularExpenseData into XML format for SYUUSHI07_14.
 */
export function serializeRegularExpenseData(
  data: RegularExpenseData,
): XMLBuilder {
  const frag = fragment();
  const root = frag.ele("SYUUSHI07_14");

  // KUBUN1: 光熱水費
  root.import(serializeRegularExpenseKubun("KUBUN1", data.utilities));

  // KUBUN2: 備品・消耗品費
  root.import(serializeRegularExpenseKubun("KUBUN2", data.equipmentSupplies));

  // KUBUN3: 事務所費
  root.import(serializeRegularExpenseKubun("KUBUN3", data.officeExpenses));

  return frag;
}

/**
 * Serializes PoliticalActivityExpenseData into XML format for SYUUSHI07_15.
 */
export function serializePoliticalActivityExpenseData(
  data: PoliticalActivityExpenseData,
): XMLBuilder {
  const frag = fragment();
  const root = frag.ele("SYUUSHI07_15");

  // KUBUN1: 組織活動費
  root.import(
    serializePoliticalActivityExpenseKubun(
      "KUBUN1",
      data.organizationalActivities,
    ),
  );

  // KUBUN2: 選挙関係費
  root.import(
    serializePoliticalActivityExpenseKubun("KUBUN2", data.electionExpenses),
  );

  // KUBUN3: 機関紙誌の発行事業費
  root.import(
    serializePoliticalActivityExpenseKubun("KUBUN3", data.publicationExpenses),
  );

  // KUBUN4: 宣伝事業費
  root.import(
    serializePoliticalActivityExpenseKubun("KUBUN4", data.advertisingExpenses),
  );

  // KUBUN5: 政治資金パーティー開催事業費
  root.import(
    serializePoliticalActivityExpenseKubun(
      "KUBUN5",
      data.fundraisingPartyExpenses,
    ),
  );

  // KUBUN6: その他の事業費
  root.import(
    serializePoliticalActivityExpenseKubun(
      "KUBUN6",
      data.otherBusinessExpenses,
    ),
  );

  // KUBUN7: 調査研究費
  root.import(
    serializePoliticalActivityExpenseKubun("KUBUN7", data.researchExpenses),
  );

  // KUBUN8: 寄附・交付金
  root.import(
    serializePoliticalActivityExpenseKubun(
      "KUBUN8",
      data.donationsGrantsExpenses,
    ),
  );

  // KUBUN9: その他の経費
  root.import(
    serializePoliticalActivityExpenseKubun("KUBUN9", data.otherExpenses),
  );

  return frag;
}

/**
 * Serializes GrantToHeadquartersSection into XML format for SYUUSHI07_16.
 */
export function serializeGrantToHeadquartersSection(
  section: GrantToHeadquartersSection,
): XMLBuilder {
  const frag = fragment();
  const root = frag.ele("SYUUSHI07_16");
  const sheet = root.ele("SHEET");

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

// ============================================================
// Helper Functions
// ============================================================

function serializeRegularExpenseKubun(
  kubunName: string,
  section: RegularExpenseSection,
): XMLBuilder {
  const frag = fragment();
  const kubun = frag.ele(kubunName);
  const sheet = kubun.ele("SHEET");

  sheet.ele("KINGAKU_GK").txt(formatAmount(section.totalAmount));

  if (section.sonotaGk > 0) {
    sheet.ele("SONOTA_GK").txt(formatAmount(section.sonotaGk));
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
    } else {
      rowEle.ele("RYOUSYU");
    }
  }

  return frag;
}

function serializePoliticalActivityExpenseKubun(
  kubunName: string,
  section: PoliticalActivityExpenseSection,
): XMLBuilder {
  const frag = fragment();
  const kubun = frag.ele(kubunName);
  const sheet = kubun.ele("SHEET");

  if (section.himoku) {
    sheet.ele("HIMOKU").txt(section.himoku);
  } else {
    sheet.ele("HIMOKU");
  }

  sheet.ele("KINGAKU_GK").txt(formatAmount(section.totalAmount));

  if (section.sonotaGk > 0) {
    sheet.ele("SONOTA_GK").txt(formatAmount(section.sonotaGk));
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
    } else {
      rowEle.ele("RYOUSYU");
    }
  }

  return frag;
}
