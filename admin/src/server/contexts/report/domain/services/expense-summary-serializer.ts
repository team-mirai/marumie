/**
 * Expense Summary Serializer
 *
 * Serializes ExpenseSummaryData to XML for SYUUSHI07_13 (支出項目別金額の内訳・総括表).
 */
import "server-only";

import { fragment } from "xmlbuilder2";
import type { XMLBuilder } from "xmlbuilder2/lib/interfaces";
import type {
  ExpenseSummaryData,
  ExpenseSummaryItem,
} from "@/server/contexts/report/domain/models/expense-summary";
import { formatAmount } from "@/server/contexts/report/domain/services/serializer-utils";

/**
 * 金額タグを出力する
 * - null: 空タグ
 * - 0以上: 金額を出力
 */
function serializeAmountTag(sheet: XMLBuilder, tagName: string, amount: number | null): void {
  if (amount === null) {
    sheet.ele(tagName);
  } else {
    sheet.ele(tagName).txt(formatAmount(amount));
  }
}

/**
 * 交付金タグを出力する（現状は常にnull）
 */
function serializeGrantTag(sheet: XMLBuilder, tagName: string, grantAmount: number | null): void {
  if (grantAmount === null) {
    sheet.ele(tagName);
  } else {
    sheet.ele(tagName).txt(formatAmount(grantAmount));
  }
}

/**
 * 備考タグを出力する（現状は常にnull）
 */
function serializeBikouTag(sheet: XMLBuilder, tagName: string, bikou: string | null): void {
  if (bikou === null) {
    sheet.ele(tagName);
  } else {
    sheet.ele(tagName).txt(bikou);
  }
}

/**
 * 経常経費の項目を出力する
 */
function serializeRegularExpenseItem(
  sheet: XMLBuilder,
  item: ExpenseSummaryItem,
  gkTag: string,
  koufuTag: string,
  bikouTag: string,
): void {
  serializeAmountTag(sheet, gkTag, item.amount);
  serializeGrantTag(sheet, koufuTag, item.grantAmount);
  serializeBikouTag(sheet, bikouTag, item.bikou);
}

/**
 * 政治活動費の項目を出力する（0でもOK）
 */
function serializePoliticalExpenseItem(
  sheet: XMLBuilder,
  item: ExpenseSummaryItem,
  gkTag: string,
  koufuTag: string,
  bikouTag: string,
): void {
  const amount = item.amount ?? 0;
  sheet.ele(gkTag).txt(formatAmount(amount));
  serializeGrantTag(sheet, koufuTag, item.grantAmount);
  serializeBikouTag(sheet, bikouTag, item.bikou);
}

/**
 * SYUUSHI07_13のXMLフラグメントを生成する
 */
export function serializeExpenseSummary(data: ExpenseSummaryData): ReturnType<typeof fragment> {
  const regular = data.regularExpenses;
  const political = data.politicalActivityExpenses;

  const frag = fragment();
  const sheet = frag.ele("SYUUSHI07_13").ele("SHEET");

  serializeRegularExpenseItem(
    sheet,
    regular.personnelExpense,
    "JINKENHI_GK",
    "JINKENHI_KOUFU",
    "JINKENHI_BIKOU",
  );
  serializeRegularExpenseItem(
    sheet,
    regular.utilityExpense,
    "KOUNETU_GK",
    "KOUNETU_KOUFU",
    "KOUNETU_BIKOU",
  );
  serializeRegularExpenseItem(
    sheet,
    regular.suppliesExpense,
    "BIHIN_GK",
    "BIHIN_KOUFU",
    "BIHIN_BIKOU",
  );
  serializeRegularExpenseItem(
    sheet,
    regular.officeExpense,
    "JIMUSYO_GK",
    "JIMUSYO_KOUFU",
    "JIMUSYO_BIKOU",
  );

  sheet.ele("KEIHI_SKEI_GK").txt(formatAmount(regular.subtotal.amount ?? 0));
  serializeGrantTag(sheet, "KEIHI_SKEI_KOUFU", regular.subtotal.grantAmount);
  serializeBikouTag(sheet, "KEIHI_SKEI_BIKOU", regular.subtotal.bikou);

  serializePoliticalExpenseItem(
    sheet,
    political.organizationExpense,
    "SOSIKI_GK",
    "SOSIKI_KOUFU",
    "SOSIKI_BIKOU",
  );
  serializePoliticalExpenseItem(
    sheet,
    political.electionExpense,
    "SENKYO_GK",
    "SENKYO_KOUFU",
    "SENKYO_BIKOU",
  );
  serializePoliticalExpenseItem(
    sheet,
    political.businessExpense,
    "SONOTA_JIGYO_GK",
    "SONOTA_JIGYO_KOUFU",
    "SONOTA_JIGYO_BIKOU",
  );
  serializePoliticalExpenseItem(
    sheet,
    political.publicationExpense,
    "HAKKOU_JIGYO_GK",
    "HAKKOU_JIGYO_KOUFU",
    "HAKKOU_JIGYO_BIKOU",
  );
  serializePoliticalExpenseItem(
    sheet,
    political.advertisingExpense,
    "SENDEN_GK",
    "SENDEN_KOUFU",
    "SENDEN_BIKOU",
  );
  serializePoliticalExpenseItem(
    sheet,
    political.partyExpense,
    "KAISAI_GK",
    "KAISAI_KOUFU",
    "KAISAI_BIKOU",
  );
  serializePoliticalExpenseItem(
    sheet,
    political.otherBusinessExpense,
    "SONOTA_GK",
    "SONOTA_KOUFU",
    "SONOTA_BIKOU",
  );
  serializePoliticalExpenseItem(
    sheet,
    political.researchExpense,
    "CYOUSA_GK",
    "CYOUSA_KOUFU",
    "CYOUSA_BIKOU",
  );
  serializePoliticalExpenseItem(
    sheet,
    political.donationGrantExpense,
    "KIFU_GK",
    "KIFU_KOUFU",
    "KIFU_BIKOU",
  );
  serializePoliticalExpenseItem(
    sheet,
    political.otherPoliticalExpense,
    "SONOTA_KEIHI_GK",
    "SONOTA_KEIHI_KOUFU",
    "SONOTA_KEIHI_BIKOU",
  );

  sheet.ele("KATUDOU_SKEI_GK").txt(formatAmount(political.subtotal.amount ?? 0));
  serializeGrantTag(sheet, "KATUDOU_SKEI_KOUFU", political.subtotal.grantAmount);
  serializeBikouTag(sheet, "KATUDOU_SKEI_BIKOU", political.subtotal.bikou);

  sheet.ele("GKEI_GK").txt(formatAmount(data.totalAmount));

  return frag;
}
