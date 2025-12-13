/**
 * Income Transaction Types
 *
 * Input types for income-related transactions fetched from the repository.
 * These types represent the data structure returned by the database layer.
 */

/**
 * 共通フィールド（全収入トランザクション共通）
 */
interface BaseIncomeTransaction {
  transactionNo: string;
  friendlyCategory: string | null;
  label: string | null;
  description: string | null;
  memo: string | null;
  debitAmount: number;
  creditAmount: number;
}

/**
 * SYUUSHI07_03: 事業による収入のトランザクション
 */
export interface BusinessIncomeTransaction extends BaseIncomeTransaction {}

/**
 * SYUUSHI07_04: 借入金のトランザクション
 */
export interface LoanIncomeTransaction extends BaseIncomeTransaction {
  transactionDate: Date;
  counterpartName: string;
  counterpartAddress: string;
}

/**
 * SYUUSHI07_05: 交付金のトランザクション
 */
export interface GrantIncomeTransaction extends BaseIncomeTransaction {
  transactionDate: Date;
  counterpartName: string;
  counterpartAddress: string;
}

/**
 * SYUUSHI07_06: その他の収入のトランザクション
 */
export interface OtherIncomeTransaction extends BaseIncomeTransaction {}
