import type { DonorType } from "./donor";

/**
 * プレビュー行のステータス
 */
export type PreviewDonorCsvRowStatus =
  | "valid"
  | "invalid"
  | "transaction_not_found"
  | "type_mismatch";

/**
 * Transaction の共通フィールド（TransactionForDonorCsv と PreviewDonorCsvRow.transaction で共有）
 */
interface TransactionCsvBase {
  id: string;
  transactionDate: Date;
  categoryKey: string;
  friendlyCategory: string | null;
  debitAmount: number;
  creditAmount: number;
  debitPartner: string | null;
  creditPartner: string | null;
  existingDonor: {
    id: string;
    name: string;
    donorType: DonorType;
  } | null;
}

/**
 * Donor CSV バリデーションに必要な Transaction 情報
 */
export interface TransactionForDonorCsv extends TransactionCsvBase {
  transactionNo: string;
}

/**
 * プレビュー行モデル
 */
export interface PreviewDonorCsvRow {
  /** CSV行番号（1始まり） */
  rowNumber: number;

  /** 入力値 */
  transactionNo: string;
  name: string;
  donorType: DonorType | null;
  address: string | null;
  occupation: string | null;

  /** バリデーション結果 */
  status: PreviewDonorCsvRowStatus;
  errors: string[];

  /** 紐付け先 Transaction 情報（存在する場合） */
  transaction: TransactionCsvBase | null;

  /** 既存 Donor との一致（name + address + donorType で検索） */
  matchingDonor: {
    id: string;
    name: string;
    donorType: DonorType;
    address: string | null;
  } | null;
}
