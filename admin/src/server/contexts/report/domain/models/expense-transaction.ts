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

/**
 * SYUUSHI07_15 KUBUN1: 組織活動費のトランザクション
 */
export interface OrganizationExpenseTransaction
  extends BaseExpenseTransaction {}

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

/**
 * SYUUSHI07_15 KUBUN1: 組織活動費の明細行
 * 政治活動費は費目が必要
 */
export interface PoliticalActivityExpenseRow extends ExpenseRow {
  himoku: string; // 費目
}

/**
 * SYUUSHI07_15 KUBUN1: 組織活動費
 */
export interface OrganizationExpenseSection {
  himoku: string; // 費目（シート単位）
  totalAmount: number;
  underThresholdAmount: number; // その他の支出
  rows: PoliticalActivityExpenseRow[];
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

/**
 * OrganizationExpenseTransaction に関連するドメインロジック
 */
export const OrganizationExpenseTransaction = {
  ...ExpenseTransactionBase,

  /**
   * 費目を取得する
   */
  getHimoku: (tx: OrganizationExpenseTransaction): string => {
    return sanitizeText(tx.label, 200);
  },

  /**
   * 明細行に変換する（費目付き）
   */
  toRow: (
    tx: OrganizationExpenseTransaction,
    index: number,
  ): PoliticalActivityExpenseRow => {
    return {
      ichirenNo: (index + 1).toString(),
      himoku: OrganizationExpenseTransaction.getHimoku(tx),
      mokuteki: ExpenseTransactionBase.getMokuteki(tx),
      kingaku: ExpenseTransactionBase.resolveAmount(tx),
      dt: tx.transactionDate,
      nm: ExpenseTransactionBase.getNm(tx),
      adr: ExpenseTransactionBase.getAdr(tx),
      bikou: ExpenseTransactionBase.getBikou(tx),
    };
  },
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

/**
 * OrganizationExpenseSection に関連するドメインロジック
 */
export const OrganizationExpenseSection = {
  /**
   * トランザクションリストからセクションを構築する
   *
   * Business rules:
   * - Transactions >= 50,000 yen are listed individually (政治活動費は5万円以上)
   * - Transactions < 50,000 yen are aggregated into underThresholdAmount
   * - 費目（HIMOKU）はシート単位で空白（明細行ごとに設定）
   */
  fromTransactions: (
    transactions: OrganizationExpenseTransaction[],
  ): OrganizationExpenseSection => {
    const FIVE_MAN_THRESHOLD = 50000;

    const totalAmount = transactions.reduce(
      (sum, tx) => sum + ExpenseTransactionBase.resolveAmount(tx),
      0,
    );

    const detailedTransactions = transactions.filter((tx) =>
      isAboveThreshold(
        ExpenseTransactionBase.resolveAmount(tx),
        FIVE_MAN_THRESHOLD,
      ),
    );
    const underThresholdTransactions = transactions.filter(
      (tx) =>
        !isAboveThreshold(
          ExpenseTransactionBase.resolveAmount(tx),
          FIVE_MAN_THRESHOLD,
        ),
    );

    const underThresholdAmount = underThresholdTransactions.reduce(
      (sum, tx) => sum + ExpenseTransactionBase.resolveAmount(tx),
      0,
    );

    const rows = detailedTransactions.map((tx, index) =>
      OrganizationExpenseTransaction.toRow(tx, index),
    );

    return {
      himoku: "", // シート単位の費目は空白（明細行に個別設定）
      totalAmount,
      underThresholdAmount,
      rows,
    };
  },
} as const;
