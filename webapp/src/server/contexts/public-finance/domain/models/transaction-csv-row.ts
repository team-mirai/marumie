import type { Transaction } from "@/shared/models/transaction";
import {
  getAccountFromTransaction,
  getAmountFromTransaction,
} from "@/server/contexts/public-finance/domain/models/display-transaction";

/**
 * TransactionCsvRow ドメインモデル
 *
 * CSV ダウンロードの 1 行に載せる値を表現する。
 * 金額と科目は表示用の変換（DisplayTransaction）と同じ規則で、
 * 収入なら貸方、支出なら借方から取る。
 */

/** CSV の列見出し（TransactionCsvRow の並び順） */
export const TRANSACTION_CSV_HEADERS = [
  "日付",
  "政治団体名",
  "タイプ",
  "金額",
  "カテゴリ",
  "詳細区分",
  "ラベル",
] as const;

/**
 * CSV の 1 行分の値（エスケープ前）
 */
interface TransactionCsvRow {
  /** "YYYY-MM-DD" 形式（UTC） */
  date: string;
  politicalOrganizationName: string;
  typeLabel: "収入" | "支出";
  amount: number;
  account: string;
  friendlyCategory: string;
  label: string;
}

/**
 * 取引を CSV の 1 行分の値に変換する
 * @param transaction 政治団体名付きの取引
 * @returns CSV の 1 行分の値
 */
export function toTransactionCsvRow(
  transaction: Transaction & { political_organization_name: string },
): TransactionCsvRow {
  return {
    date: new Date(transaction.transaction_date).toISOString().split("T")[0],
    politicalOrganizationName: transaction.political_organization_name,
    typeLabel: transaction.transaction_type === "income" ? "収入" : "支出",
    amount: getAmountFromTransaction(transaction),
    account: getAccountFromTransaction(transaction),
    friendlyCategory: transaction.friendly_category,
    label: transaction.label,
  };
}
