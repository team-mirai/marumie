import type { Transaction } from "@/shared/models/transaction";
import { PL_CATEGORIES, type CategoryMapping } from "@/shared/utils/category-mapping";
import type { DisplayTransaction, DisplayTransactionType } from "@/types/display-transaction";

/**
 * アカウント名からカテゴリマッピングを取得する関数
 * 存在しない場合は"unknown"を返す
 */
export function getCategoryMapping(account: string): CategoryMapping {
  return (
    PL_CATEGORIES[account] || {
      category: "unknown",
      subcategory: "unknown",
      color: "#99F6E4",
      shortLabel: "不明",
    }
  );
}

/**
 * Transaction を DisplayTransaction に変換する関数
 * @param transaction 元のTransactionオブジェクト
 * @returns 表示用に変換されたDisplayTransactionオブジェクト
 */
export function convertToDisplayTransaction(transaction: Transaction): DisplayTransaction {
  // offset系のトランザクションタイプが渡された場合は警告を出力
  if (
    transaction.transaction_type === "offset_income" ||
    transaction.transaction_type === "offset_expense"
  ) {
    console.warn(
      `offset（相殺取引）を直接表示することは想定されていません。データ取得方法が間違っていないか確認しましょう。transaction_type: ${transaction.transaction_type}, transaction ID: ${transaction.id}`,
    );
  }

  // 年月の生成 (例: "2025.08")
  const date = new Date(transaction.transaction_date);
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const yearmonth = `${year}.${month}`;

  // アカウント名の取得（支出の場合は借方勘定、収入の場合は貸方勘定を使用）
  const account =
    transaction.transaction_type === "expense"
      ? transaction.debit_account
      : transaction.credit_account;

  // カテゴリマッピングを取得
  const categoryMapping = getCategoryMapping(account);
  const category = categoryMapping.category;
  const subcategory = categoryMapping.subcategory;

  // 金額の計算
  const baseAmount =
    transaction.transaction_type === "expense"
      ? transaction.debit_amount
      : transaction.credit_amount;

  const absAmount = Math.abs(baseAmount);
  const amount = transaction.transaction_type === "expense" ? -absAmount : absAmount;

  return {
    id: transaction.id,
    date: transaction.transaction_date,
    yearmonth,
    transactionType: transaction.transaction_type as DisplayTransactionType,
    category,
    subcategory,
    account,
    label: transaction.label || "",
    shortLabel: categoryMapping.shortLabel,
    friendly_category: transaction.friendly_category,
    absAmount,
    amount,
  };
}

/**
 * Transaction配列をDisplayTransaction配列に変換する関数
 */
export function convertToDisplayTransactions(transactions: Transaction[]): DisplayTransaction[] {
  return transactions.map(convertToDisplayTransaction);
}
