/**
 * Income Converter
 *
 * Converts raw transaction data from the database into income-related domain objects.
 * This is a pure function layer that handles data transformation and business rules.
 */

import type {
  BusinessIncomeTransaction,
  GrantIncomeTransaction,
  LoanIncomeTransaction,
  OtherIncomeTransaction,
} from "@/server/domain/types/income-transaction";

const TEN_MAN_THRESHOLD = 100_000;

// Re-export input types for consumers
export type {
  BusinessIncomeTransaction,
  GrantIncomeTransaction,
  LoanIncomeTransaction,
  OtherIncomeTransaction,
};

// ============================================================
// Output Types (Domain Objects)
// ============================================================

/**
 * SYUUSHI07_03: 事業による収入の明細行
 */
export interface BusinessIncomeRow {
  ichirenNo: string;
  gigyouSyurui: string; // 事業の種類
  kingaku: number;
  bikou?: string;
}

/**
 * SYUUSHI07_03: 事業による収入
 */
export interface BusinessIncomeSection {
  totalAmount: number;
  rows: BusinessIncomeRow[];
}

/**
 * SYUUSHI07_04: 借入金の明細行
 */
export interface LoanIncomeRow {
  ichirenNo: string;
  kariiresaki: string; // 借入先
  kingaku: number;
  bikou?: string;
}

/**
 * SYUUSHI07_04: 借入金
 */
export interface LoanIncomeSection {
  totalAmount: number;
  rows: LoanIncomeRow[];
}

/**
 * SYUUSHI07_05: 本部又は支部から供与された交付金の明細行
 */
export interface GrantIncomeRow {
  ichirenNo: string;
  honsibuNm: string; // 本支部名称
  kingaku: number;
  dt: Date; // 年月日
  jimuAdr: string; // 主たる事務所の所在地
  bikou?: string;
}

/**
 * SYUUSHI07_05: 本部又は支部から供与された交付金
 */
export interface GrantIncomeSection {
  totalAmount: number;
  rows: GrantIncomeRow[];
}

/**
 * SYUUSHI07_06: その他の収入の明細行
 */
export interface OtherIncomeRow {
  ichirenNo: string;
  tekiyou: string;
  kingaku: number;
  bikou?: string;
}

/**
 * SYUUSHI07_06: その他の収入
 */
export interface OtherIncomeSection {
  totalAmount: number;
  underThresholdAmount: number;
  rows: OtherIncomeRow[];
}

// ============================================================
// Internal Types
// ============================================================

interface SectionTransaction {
  transactionNo: string;
  friendlyCategory: string | null;
  label: string | null;
  description: string | null;
  memo: string | null;
  amount: number;
}

interface SectionTransactionWithCounterpart extends SectionTransaction {
  transactionDate: Date;
  counterpartName: string;
  counterpartAddress: string;
}

// ============================================================
// Converter Functions
// ============================================================

/**
 * SYUUSHI07_03: 事業による収入を変換
 */
export function convertToBusinessIncomeSection(
  transactions: BusinessIncomeTransaction[],
): BusinessIncomeSection {
  const sectionTransactions = transactions.map(toSectionTransaction);
  return aggregateBusinessIncome(sectionTransactions);
}

/**
 * SYUUSHI07_04: 借入金を変換
 */
export function convertToLoanIncomeSection(
  transactions: LoanIncomeTransaction[],
): LoanIncomeSection {
  const sectionTransactions = transactions.map(
    toSectionTransactionWithCounterpart,
  );
  return aggregateLoanIncome(sectionTransactions);
}

/**
 * SYUUSHI07_05: 交付金を変換
 */
export function convertToGrantIncomeSection(
  transactions: GrantIncomeTransaction[],
): GrantIncomeSection {
  const sectionTransactions = transactions.map(
    toSectionTransactionWithCounterpart,
  );
  return aggregateGrantIncome(sectionTransactions);
}

/**
 * SYUUSHI07_06: その他の収入を変換
 *
 * Business rules:
 * - Transactions >= 100,000 yen are listed individually
 * - Transactions < 100,000 yen are aggregated into underThresholdAmount
 */
export function convertToOtherIncomeSection(
  transactions: OtherIncomeTransaction[],
): OtherIncomeSection {
  const sectionTransactions = transactions.map(toSectionTransaction);
  return aggregateOtherIncome(sectionTransactions);
}

// ============================================================
// Input Mapping Functions
// ============================================================

function toSectionTransaction(
  t: BusinessIncomeTransaction | OtherIncomeTransaction,
): SectionTransaction {
  return {
    transactionNo: t.transactionNo,
    friendlyCategory: t.friendlyCategory,
    label: t.label,
    description: t.description,
    memo: t.memo,
    amount: resolveTransactionAmount(t.debitAmount, t.creditAmount),
  };
}

function toSectionTransactionWithCounterpart(
  t: LoanIncomeTransaction | GrantIncomeTransaction,
): SectionTransactionWithCounterpart {
  return {
    transactionNo: t.transactionNo,
    friendlyCategory: t.friendlyCategory,
    label: t.label,
    description: t.description,
    memo: t.memo,
    amount: resolveTransactionAmount(t.debitAmount, t.creditAmount),
    transactionDate: t.transactionDate,
    counterpartName: t.counterpartName,
    counterpartAddress: t.counterpartAddress,
  };
}

// ============================================================
// Aggregation Functions
// ============================================================

function aggregateBusinessIncome(
  transactions: SectionTransaction[],
): BusinessIncomeSection {
  const totalAmount = transactions.reduce((sum, t) => sum + t.amount, 0);

  const rows: BusinessIncomeRow[] = transactions.map((t, index) => ({
    ichirenNo: (index + 1).toString(),
    gigyouSyurui: buildGigyouSyurui(t),
    kingaku: Math.round(t.amount),
    bikou: buildBikou(t),
  }));

  return { totalAmount, rows };
}

function aggregateLoanIncome(
  transactions: SectionTransactionWithCounterpart[],
): LoanIncomeSection {
  const totalAmount = transactions.reduce((sum, t) => sum + t.amount, 0);

  const rows: LoanIncomeRow[] = transactions.map((t, index) => ({
    ichirenNo: (index + 1).toString(),
    kariiresaki: buildKariiresaki(t),
    kingaku: Math.round(t.amount),
    bikou: buildBikou(t),
  }));

  return { totalAmount, rows };
}

function aggregateGrantIncome(
  transactions: SectionTransactionWithCounterpart[],
): GrantIncomeSection {
  const totalAmount = transactions.reduce((sum, t) => sum + t.amount, 0);

  const rows: GrantIncomeRow[] = transactions.map((t, index) => ({
    ichirenNo: (index + 1).toString(),
    honsibuNm: buildHonsibuNm(t),
    kingaku: Math.round(t.amount),
    dt: t.transactionDate,
    jimuAdr: buildJimuAdr(t),
    bikou: buildBikou(t),
  }));

  return { totalAmount, rows };
}

function aggregateOtherIncome(
  transactions: SectionTransaction[],
): OtherIncomeSection {
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

  const rows: OtherIncomeRow[] = detailedRows.map((t, index) => ({
    ichirenNo: (index + 1).toString(),
    tekiyou: buildTekiyou(t),
    kingaku: Math.round(t.amount),
    bikou: buildBikou(t),
  }));

  return { totalAmount, underThresholdAmount, rows };
}

// ============================================================
// Field Builder Functions
// ============================================================

function buildGigyouSyurui(t: SectionTransaction): string {
  return sanitizeText(t.friendlyCategory, 200);
}

function buildKariiresaki(t: SectionTransactionWithCounterpart): string {
  return sanitizeText(t.counterpartName, 200);
}

function buildHonsibuNm(t: SectionTransactionWithCounterpart): string {
  return sanitizeText(t.counterpartName, 120);
}

function buildJimuAdr(t: SectionTransactionWithCounterpart): string {
  return sanitizeText(t.counterpartAddress, 80);
}

function buildTekiyou(t: SectionTransaction): string {
  return sanitizeText(t.friendlyCategory, 200);
}

function buildBikou(t: SectionTransaction): string {
  const mfRowInfo = `MF行番号: ${t.transactionNo || "-"}`;
  const memoText = sanitizeText(t.memo, 160);
  const combined = memoText ? `${memoText} / ${mfRowInfo}` : mfRowInfo;

  return sanitizeText(combined, 200) || mfRowInfo;
}

function resolveTransactionAmount(
  debitAmount: number,
  creditAmount: number,
): number {
  if (Number.isFinite(creditAmount) && creditAmount > 0) {
    return creditAmount;
  }

  return Number.isFinite(debitAmount) ? debitAmount : 0;
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
export { resolveTransactionAmount, type SectionTransaction };
