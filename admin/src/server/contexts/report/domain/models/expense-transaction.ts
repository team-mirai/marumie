/**
 * Expense Transaction Types
 *
 * Transaction types for expense-related reports.
 * These types represent raw data retrieved from the database for expense transactions.
 */

import {
  resolveExpenseAmount,
  sanitizeText,
  buildBikou,
  isAboveThreshold,
  TEN_MAN_THRESHOLD,
} from "@/server/contexts/report/domain/models/transaction-utils";

/**
 * 経常経費（SYUUSHI07_14）のトランザクション基本型
 */
interface BaseExpenseTransaction {
  transactionNo: string;
  friendlyCategory: string | null;
  label: string | null;
  description: string | null;
  memo: string | null;
  debitAmount: number;
  creditAmount: number;
  transactionDate: Date;
  counterpartName: string; // 支払先の氏名
  counterpartAddress: string; // 支払先の住所
}

/**
 * SYUUSHI07_14 KUBUN1: 光熱水費のトランザクション
 */
export interface UtilityExpenseTransaction extends BaseExpenseTransaction {}

/**
 * SYUUSHI07_14 KUBUN2: 備品・消耗品費のトランザクション
 */
export interface SuppliesExpenseTransaction extends BaseExpenseTransaction {}

/**
 * SYUUSHI07_14 KUBUN3: 事務所費のトランザクション
 */
export interface OfficeExpenseTransaction extends BaseExpenseTransaction {}

// ============================================================
// Output Types (Domain Objects for XML)
// ============================================================

/**
 * SYUUSHI07_14 KUBUN1/KUBUN2/KUBUN3: 経常経費の明細行
 */
export interface ExpenseRow {
  ichirenNo: string;
  mokuteki: string; // 目的
  kingaku: number;
  dt: Date; // 年月日
  nm: string; // 氏名
  adr: string; // 住所
  bikou?: string;
  ryousyu?: number; // 領収書区分
}

/**
 * SYUUSHI07_14 KUBUN1: 光熱水費
 */
export interface UtilityExpenseSection {
  totalAmount: number;
  underThresholdAmount: number; // その他の支出（10万円未満）
  rows: ExpenseRow[];
}

/**
 * SYUUSHI07_14 KUBUN2: 備品・消耗品費
 */
export interface SuppliesExpenseSection {
  totalAmount: number;
  underThresholdAmount: number; // その他の支出（10万円未満）
  rows: ExpenseRow[];
}

/**
 * SYUUSHI07_14 KUBUN3: 事務所費
 */
export interface OfficeExpenseSection {
  totalAmount: number;
  underThresholdAmount: number; // その他の支出（10万円未満）
  rows: ExpenseRow[];
}

// ============================================================
// Domain Logic
// ============================================================

/**
 * ExpenseTransaction に共通するドメインロジック
 */
const ExpenseTransactionBase = {
  /**
   * 取引金額を解決する（丸め済み）
   */
  resolveAmount: (tx: BaseExpenseTransaction): number => {
    return Math.round(resolveExpenseAmount(tx.debitAmount, tx.creditAmount));
  },

  /**
   * 目的を取得する
   */
  getMokuteki: (tx: BaseExpenseTransaction): string => {
    return sanitizeText(tx.friendlyCategory, 200);
  },

  /**
   * 氏名を取得する
   */
  getNm: (tx: BaseExpenseTransaction): string => {
    return sanitizeText(tx.counterpartName, 120);
  },

  /**
   * 住所を取得する
   */
  getAdr: (tx: BaseExpenseTransaction): string => {
    return sanitizeText(tx.counterpartAddress, 120);
  },

  /**
   * 備考を構築する
   */
  getBikou: (tx: BaseExpenseTransaction): string => {
    return buildBikou(tx.transactionNo, tx.memo, 160, 100);
  },

  /**
   * 閾値（10万円）以上かどうかを判定
   */
  isAboveThreshold: (tx: BaseExpenseTransaction): boolean => {
    return isAboveThreshold(
      ExpenseTransactionBase.resolveAmount(tx),
      TEN_MAN_THRESHOLD,
    );
  },

  /**
   * 明細行に変換する
   */
  toRow: (tx: BaseExpenseTransaction, index: number): ExpenseRow => {
    return {
      ichirenNo: (index + 1).toString(),
      mokuteki: ExpenseTransactionBase.getMokuteki(tx),
      kingaku: ExpenseTransactionBase.resolveAmount(tx),
      dt: tx.transactionDate,
      nm: ExpenseTransactionBase.getNm(tx),
      adr: ExpenseTransactionBase.getAdr(tx),
      bikou: ExpenseTransactionBase.getBikou(tx),
    };
  },
};

/**
 * UtilityExpenseTransaction に関連するドメインロジック
 */
export const UtilityExpenseTransaction = {
  ...ExpenseTransactionBase,
} as const;

/**
 * SuppliesExpenseTransaction に関連するドメインロジック
 */
export const SuppliesExpenseTransaction = {
  ...ExpenseTransactionBase,
} as const;

/**
 * OfficeExpenseTransaction に関連するドメインロジック
 */
export const OfficeExpenseTransaction = {
  ...ExpenseTransactionBase,
} as const;

// ============================================================
// Section Aggregation Logic
// ============================================================

/**
 * ExpenseSection の集約ロジック（共通）
 */
function aggregateExpenseSection<T extends BaseExpenseTransaction>(
  transactions: T[],
): { totalAmount: number; underThresholdAmount: number; rows: ExpenseRow[] } {
  const totalAmount = transactions.reduce(
    (sum, tx) => sum + ExpenseTransactionBase.resolveAmount(tx),
    0,
  );

  const detailedTransactions = transactions.filter((tx) =>
    ExpenseTransactionBase.isAboveThreshold(tx),
  );
  const underThresholdTransactions = transactions.filter(
    (tx) => !ExpenseTransactionBase.isAboveThreshold(tx),
  );

  const underThresholdAmount = underThresholdTransactions.reduce(
    (sum, tx) => sum + ExpenseTransactionBase.resolveAmount(tx),
    0,
  );

  const rows = detailedTransactions.map((tx, index) =>
    ExpenseTransactionBase.toRow(tx, index),
  );

  return { totalAmount, underThresholdAmount, rows };
}

/**
 * UtilityExpenseSection に関連するドメインロジック
 */
export const UtilityExpenseSection = {
  /**
   * トランザクションリストからセクションを構築する
   *
   * Business rules:
   * - Transactions >= 100,000 yen are listed individually
   * - Transactions < 100,000 yen are aggregated into underThresholdAmount
   */
  fromTransactions: (
    transactions: UtilityExpenseTransaction[],
  ): UtilityExpenseSection => {
    return aggregateExpenseSection(transactions);
  },
} as const;

/**
 * SuppliesExpenseSection に関連するドメインロジック
 */
export const SuppliesExpenseSection = {
  /**
   * トランザクションリストからセクションを構築する
   *
   * Business rules:
   * - Transactions >= 100,000 yen are listed individually
   * - Transactions < 100,000 yen are aggregated into underThresholdAmount
   */
  fromTransactions: (
    transactions: SuppliesExpenseTransaction[],
  ): SuppliesExpenseSection => {
    return aggregateExpenseSection(transactions);
  },
} as const;

/**
 * OfficeExpenseSection に関連するドメインロジック
 */
export const OfficeExpenseSection = {
  /**
   * トランザクションリストからセクションを構築する
   *
   * Business rules:
   * - Transactions >= 100,000 yen are listed individually
   * - Transactions < 100,000 yen are aggregated into underThresholdAmount
   */
  fromTransactions: (
    transactions: OfficeExpenseTransaction[],
  ): OfficeExpenseSection => {
    return aggregateExpenseSection(transactions);
  },
} as const;
