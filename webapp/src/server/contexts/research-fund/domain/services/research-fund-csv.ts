import type { PublishedResearchFund } from "@/server/contexts/research-fund/domain/models/published-research-fund";
import {
  compareExpenseOrder,
  UNKNOWN_CATEGORY_LABEL,
} from "@/server/contexts/research-fund/domain/services/research-fund-expense-list";

/**
 * CSV の列。
 *
 * 備考（memo）は公開されない事務所内メモなので列に無い（そもそも公開ページの
 * 射影に入っていない）。分割の説明は「分割グループ」列で表せるため、
 * 特記事項には仕訳の note をそのまま出す。
 */
const HEADERS = [
  "日付",
  "カテゴリー",
  "法定区分",
  "項目",
  "金額",
  "特記事項",
  "分割グループ",
  "領収書",
] as const;

/** ファイル名に使える文字だけを残す（Content-Disposition ヘッダへの混入を防ぐ）。 */
function sanitizeForFilename(value: string): string {
  return value.replace(/[^A-Za-z0-9_-]/g, "-");
}

/** すべての値を引用符で囲み、値の中の引用符は2つ重ねて表す（RFC 4180）。 */
function escapeCsvValue(value: string): string {
  return `"${value.replace(/"/g, '""')}"`;
}

/**
 * 議員ページの CSV。published の支出だけを、画面（B-4）と同じ並び順で出す。
 *
 * 文字コード（UTF-8 + BOM）は配信側で付ける。既存の取引 CSV と同じ扱い。
 */
export function buildResearchFundCsv(
  published: Pick<PublishedResearchFund, "expenses" | "accounts">,
): string {
  const rows = [...published.expenses].sort(compareExpenseOrder).map((expense) => {
    const account = published.accounts[expense.accountKey];
    return [
      expense.date,
      account?.label || UNKNOWN_CATEGORY_LABEL,
      account?.legalLabel || UNKNOWN_CATEGORY_LABEL,
      expense.description,
      String(expense.amount),
      expense.note?.trim() ? expense.note : "",
      expense.splitGroup ?? "",
      expense.hasReceipt ? "あり" : "なし",
    ]
      .map(escapeCsvValue)
      .join(",");
  });

  return [HEADERS.map(escapeCsvValue).join(","), ...rows].join("\n");
}

/** 既存の取引 CSV（`transactions_<slug>_<日付>.csv`）に合わせたファイル名。 */
export function researchFundCsvFilename(slug: string, financialYear: number, now: Date): string {
  const timestamp = now.toISOString().slice(0, 10);
  return `research_fund_${sanitizeForFilename(slug)}_${financialYear}_${timestamp}.csv`;
}
