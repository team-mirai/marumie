/**
 * Expense Converter
 *
 * Converts raw transaction data from the database into expense-related domain objects.
 * This is a pure function layer that handles data transformation and business rules.
 */

import type {
  OfficeExpenseTransaction,
  SuppliesExpenseTransaction,
  UtilityExpenseTransaction,
} from "@/server/contexts/report/domain/types/expense-transaction";

const TEN_MAN_THRESHOLD = 100_000;

// Re-export input types for consumers
export type {
  UtilityExpenseTransaction,
  SuppliesExpenseTransaction,
  OfficeExpenseTransaction,
};

// ============================================================
// Output Types (Domain Objects)
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
// Internal Types
// ============================================================

interface SectionTransactionWithCounterpart {
  transactionNo: string;
  friendlyCategory: string | null;
  label: string | null;
  description: string | null;
  memo: string | null;
  amount: number;
  transactionDate: Date;
  counterpartName: string;
  counterpartAddress: string;
}

// ============================================================
// Converter Functions
// ============================================================

/**
 * SYUUSHI07_14 KUBUN1: 光熱水費を変換
 *
 * Business rules:
 * - Transactions >= 100,000 yen are listed individually
 * - Transactions < 100,000 yen are aggregated into underThresholdAmount
 */
export function convertToUtilityExpenseSection(
  transactions: UtilityExpenseTransaction[],
): UtilityExpenseSection {
  const sectionTransactions = transactions.map(
    toSectionTransactionWithCounterpart,
  );
  return aggregateExpenseSection(sectionTransactions);
}

/**
 * SYUUSHI07_14 KUBUN2: 備品・消耗品費を変換
 *
 * Business rules:
 * - Transactions >= 100,000 yen are listed individually
 * - Transactions < 100,000 yen are aggregated into underThresholdAmount
 */
export function convertToSuppliesExpenseSection(
  transactions: SuppliesExpenseTransaction[],
): SuppliesExpenseSection {
  const sectionTransactions = transactions.map(
    toSectionTransactionWithCounterpart,
  );
  return aggregateExpenseSection(sectionTransactions);
}

/**
 * SYUUSHI07_14 KUBUN3: 事務所費を変換
 *
 * Business rules:
 * - Transactions >= 100,000 yen are listed individually
 * - Transactions < 100,000 yen are aggregated into underThresholdAmount
 */
export function convertToOfficeExpenseSection(
  transactions: OfficeExpenseTransaction[],
): OfficeExpenseSection {
  const sectionTransactions = transactions.map(
    toSectionTransactionWithCounterpart,
  );
  return aggregateExpenseSection(sectionTransactions);
}

// ============================================================
// Input Mapping Functions
// ============================================================

function toSectionTransactionWithCounterpart(
  t:
    | UtilityExpenseTransaction
    | SuppliesExpenseTransaction
    | OfficeExpenseTransaction,
): SectionTransactionWithCounterpart {
  return {
    transactionNo: t.transactionNo,
    friendlyCategory: t.friendlyCategory,
    label: t.label,
    description: t.description,
    memo: t.memo,
    // Round amount to integer at the earliest stage for consistency
    // This ensures totalAmount, underThresholdAmount, and kingaku all use the same rounded values
    amount: Math.round(resolveTransactionAmount(t.debitAmount, t.creditAmount)),
    transactionDate: t.transactionDate,
    counterpartName: t.counterpartName,
    counterpartAddress: t.counterpartAddress,
  };
}

// ============================================================
// Aggregation Functions
// ============================================================

function aggregateExpenseSection(
  transactions: SectionTransactionWithCounterpart[],
): UtilityExpenseSection | SuppliesExpenseSection | OfficeExpenseSection {
  const totalAmount = transactions.reduce((sum, t) => sum + t.amount, 0);

  const detailedRows = transactions.filter(
    (t) => t.amount >= TEN_MAN_THRESHOLD,
  );
  const underThresholdRows = transactions.filter(
    (t) => t.amount < TEN_MAN_THRESHOLD,
  );

  const underThresholdAmount = underThresholdRows.reduce(
    (sum, t) => sum + t.amount,
    0,
  );

  const rows: ExpenseRow[] = detailedRows.map((t, index) => ({
    ichirenNo: (index + 1).toString(),
    mokuteki: buildMokuteki(t),
    kingaku: t.amount, // Already rounded at input mapping stage
    dt: t.transactionDate,
    nm: buildNm(t),
    adr: buildAdr(t),
    bikou: buildBikou(t),
  }));

  return { totalAmount, underThresholdAmount, rows };
}

// ============================================================
// Field Builder Functions
// ============================================================

function buildMokuteki(t: SectionTransactionWithCounterpart): string {
  return sanitizeText(t.friendlyCategory, 200);
}

function buildNm(t: SectionTransactionWithCounterpart): string {
  return sanitizeText(t.counterpartName, 120);
}

function buildAdr(t: SectionTransactionWithCounterpart): string {
  return sanitizeText(t.counterpartAddress, 120);
}

function buildBikou(t: SectionTransactionWithCounterpart): string {
  const mfRowInfo = `MF行番号: ${t.transactionNo || "-"}`;
  const memoText = sanitizeText(t.memo, 160);
  const combined = memoText ? `${memoText} / ${mfRowInfo}` : mfRowInfo;

  return sanitizeText(combined, 100) || mfRowInfo;
}

function resolveTransactionAmount(
  debitAmount: number,
  creditAmount: number,
): number {
  // For expenses, we typically use debitAmount as expenses are debited
  if (Number.isFinite(debitAmount) && debitAmount > 0) {
    return debitAmount;
  }

  return Number.isFinite(creditAmount) ? creditAmount : 0;
}

function sanitizeText(
  value: string | null | undefined,
  maxLength?: number,
): string {
  if (!value) {
    return "";
  }

  const normalized = value.replace(/\s+/g, " ").trim();
  if (maxLength && normalized.length > maxLength) {
    return normalized.slice(0, maxLength);
  }

  return normalized;
}

// Export for testing
export { resolveTransactionAmount, type SectionTransactionWithCounterpart };
