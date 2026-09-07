/**
 * MFクラウドCSVをパースした直後の生データ型
 * すべて string として保持（変換・バリデーション前）
 */
export interface MfCsvRecord {
  transaction_no: string;
  transaction_date: string;
  debit_account: string;
  debit_sub_account: string;
  debit_department: string;
  debit_partner: string;
  debit_tax_category: string;
  debit_invoice: string;
  debit_amount: string;
  credit_account: string;
  credit_sub_account: string;
  credit_department: string;
  credit_partner: string;
  credit_tax_category: string;
  credit_invoice: string;
  credit_amount: string;
  description: string;
  friendly_category: string;
  memo: string;
}
