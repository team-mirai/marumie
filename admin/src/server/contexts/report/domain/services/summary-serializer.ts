/**
 * Summary Serializer
 *
 * Serializes the income/expense summary (SYUUSHI07_02) into XML format.
 */

import "server-only";

import { fragment } from "xmlbuilder2";
import type { XMLBuilder } from "xmlbuilder2/lib/interfaces";
import type { SummaryData } from "@/server/contexts/report/domain/models/summary-data";
import { formatAmount } from "@/server/contexts/report/domain/services/serializer-utils";

/**
 * Serializes SummaryData into XML format for SYUUSHI07_02.
 */
export function serializeSummarySection(summary: SummaryData): XMLBuilder {
  const frag = fragment();
  const root = frag.ele("SYUUSHI07_02");
  const sheet = root.ele("SHEET");

  // 収支総括
  sheet.ele("SYUNYU_SGK").txt(formatAmount(summary.syunyuSgk));
  sheet.ele("ZENNEN_KKS_GK").txt(formatAmount(summary.zennenKksGk));
  sheet.ele("HONNEN_SYUNYU_GK").txt(formatAmount(summary.honnenSyunyuGk));
  sheet.ele("SISYUTU_SGK").txt(formatAmount(summary.sisyutuSgk));
  sheet.ele("YOKUNEN_KKS_GK").txt(formatAmount(summary.yokunenKksGk));

  // 党費（スコープ外）
  if (summary.kojinFutanKgk !== null) {
    sheet.ele("KOJIN_FUTAN_KGK").txt(formatAmount(summary.kojinFutanKgk));
  } else {
    sheet.ele("KOJIN_FUTAN_KGK");
  }
  if (summary.kojinFutanSu !== null) {
    sheet.ele("KOJIN_FUTAN_SU").txt(formatAmount(summary.kojinFutanSu));
  } else {
    sheet.ele("KOJIN_FUTAN_SU");
  }

  // 個人寄附
  sheet.ele("KOJIN_KIFU_GK").txt(formatAmount(summary.kojinKifuGk));
  if (summary.kojinKifuBikou) {
    sheet.ele("KOJIN_KIFU_BIKOU").txt(summary.kojinKifuBikou);
  } else {
    sheet.ele("KOJIN_KIFU_BIKOU");
  }

  // 特定寄附（スコープ外）
  if (summary.tokuteiKifuGk !== null) {
    sheet.ele("TOKUTEI_KIFU_GK").txt(formatAmount(summary.tokuteiKifuGk));
  } else {
    sheet.ele("TOKUTEI_KIFU_GK");
  }
  if (summary.tokuteiKifuBikou) {
    sheet.ele("TOKUTEI_KIFU_BIKOU").txt(summary.tokuteiKifuBikou);
  } else {
    sheet.ele("TOKUTEI_KIFU_BIKOU");
  }

  // 法人寄附
  if (summary.hojinKifuGk !== null) {
    sheet.ele("HOJIN_KIFU_GK").txt(formatAmount(summary.hojinKifuGk));
  } else {
    sheet.ele("HOJIN_KIFU_GK");
  }
  if (summary.hojinKifuBikou) {
    sheet.ele("HOJIN_KIFU_BIKOU").txt(summary.hojinKifuBikou);
  } else {
    sheet.ele("HOJIN_KIFU_BIKOU");
  }

  // 政治団体寄附
  if (summary.seijiKifuGk !== null) {
    sheet.ele("SEIJI_KIFU_GK").txt(formatAmount(summary.seijiKifuGk));
  } else {
    sheet.ele("SEIJI_KIFU_GK");
  }
  if (summary.seijiKifuBikou) {
    sheet.ele("SEIJI_KIFU_BIKOU").txt(summary.seijiKifuBikou);
  } else {
    sheet.ele("SEIJI_KIFU_BIKOU");
  }

  // 寄附小計
  sheet.ele("KIFU_SKEI_GK").txt(formatAmount(summary.kifuSkeiGk));
  if (summary.kifuSkeiBikou) {
    sheet.ele("KIFU_SKEI_BIKOU").txt(summary.kifuSkeiBikou);
  } else {
    sheet.ele("KIFU_SKEI_BIKOU");
  }

  // あっせんによるもの（スコープ外）
  if (summary.atusenGk !== null) {
    sheet.ele("ATUSEN_GK").txt(formatAmount(summary.atusenGk));
  } else {
    sheet.ele("ATUSEN_GK");
  }
  if (summary.atusenBikou) {
    sheet.ele("ATUSEN_BIKOU").txt(summary.atusenBikou);
  } else {
    sheet.ele("ATUSEN_BIKOU");
  }

  // 政党匿名寄附（スコープ外）
  if (summary.tokumeiKifuGk !== null) {
    sheet.ele("TOKUMEI_KIFU_GK").txt(formatAmount(summary.tokumeiKifuGk));
  } else {
    sheet.ele("TOKUMEI_KIFU_GK");
  }
  if (summary.tokumeiBikou) {
    sheet.ele("TOKUMEI_KIFU_BIKOU").txt(summary.tokumeiBikou);
  } else {
    sheet.ele("TOKUMEI_KIFU_BIKOU");
  }

  // 寄附合計
  sheet.ele("KIFU_GKEI_GK").txt(formatAmount(summary.kifuGkeiGk));
  if (summary.kifuGkeiBikou) {
    sheet.ele("KIFU_GKEI_BIKOU").txt(summary.kifuGkeiBikou);
  } else {
    sheet.ele("KIFU_GKEI_BIKOU");
  }

  return frag;
}
