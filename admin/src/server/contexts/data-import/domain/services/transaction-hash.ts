import { createHash } from "crypto";
import type { PreviewTransaction } from "@/server/contexts/data-import/domain/models/preview-transaction";

/**
 * トランザクションデータからハッシュ値を生成する
 * データ同一性の比較に使用される
 */
export function generateTransactionHash(
  transaction: PreviewTransaction,
): string {
  // ハッシュ化対象のフィールドを選択
  // IDや作成日時、ステータスなどは除外し、実際のトランザクションデータのみを対象とする
  const hashData = {
    transaction_no: transaction.transaction_no,
    transaction_date: normalizeDate(transaction.transaction_date),
    debit_account: transaction.debit_account,
    debit_sub_account: transaction.debit_sub_account || "",
    debit_amount: transaction.debit_amount,
    credit_account: transaction.credit_account,
    credit_sub_account: transaction.credit_sub_account || "",
    credit_amount: transaction.credit_amount,
    description: transaction.description || "",
  };

  // オブジェクトをJSONにシリアライズしてからハッシュ化
  const jsonString = JSON.stringify(hashData, Object.keys(hashData).sort());

  return createHash("sha256").update(jsonString, "utf8").digest("hex");
}

/**
 * 日付を正規化してハッシュの一貫性を保つ
 */
function normalizeDate(date: Date | string): string {
  if (typeof date === "string") {
    const parsedDate = new Date(date);
    if (Number.isNaN(parsedDate.getTime())) {
      throw new Error(`Invalid date string: ${date}`);
    }
    return parsedDate.toISOString().split("T")[0];
  }

  if (Number.isNaN(date.getTime())) {
    throw new Error(`Invalid Date object: ${date}`);
  }

  return date.toISOString().split("T")[0];
}
