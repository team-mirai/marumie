/**
 * CSVパース直後の生データ型
 * すべて string として保持（バリデーション前）
 */
export interface DonorCsvRecord {
  /** 行番号（1始まり、ヘッダー行を除く） */
  rowNumber: number;
  /** 紐付け対象の Transaction.transaction_no */
  transaction_no: string;
  /** 寄付者名 */
  name: string;
  /** 寄付者種別（individual / corporation / political_organization） */
  donorType: string;
  /** 住所（空文字の場合あり） */
  address: string;
  /** 職業（空文字の場合あり） */
  occupation: string;
}
