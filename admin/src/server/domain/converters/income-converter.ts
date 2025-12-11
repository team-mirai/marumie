/**
 * Income Converter
 *
 * Converts raw transaction data from the database into income-related domain objects.
 * This is a pure function layer that handles data transformation and business rules.
 */

import type { IncomeData } from "../report-data";

const TEN_MAN_THRESHOLD = 100_000;

// Category keys for classification
const BUSINESS_INCOME_CATEGORY_KEY = "publication-income";
const LOAN_INCOME_CATEGORY_KEY = "loan-income";
const GRANT_INCOME_CATEGORY_KEY = "grant-income";

// ============================================================
// Input Types (from DB/Repository)
// ============================================================

/**
 * 基本的な収入トランザクション（business, other 用）
 */
export interface IncomeTransaction {
  transactionNo: string;
  categoryKey: string | null;
  friendlyCategory: string | null;
  label: string | null;
  description: string | null;
  memo: string | null;
  debitAmount: number;
  creditAmount: number;
}

/**
 * 相手先情報を含む収入トランザクション（loan, grant 用）
 */
export interface IncomeTransactionWithCounterpart {
  transactionNo: string;
  categoryKey: string | null;
  friendlyCategory: string | null;
  label: string | null;
  description: string | null;
  memo: string | null;
  debitAmount: number;
  creditAmount: number;
  transactionDate: Date;
  counterpartName: string;
  counterpartAddress: string;
}

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

// IncomeSections は report-data.ts の IncomeData として定義

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
 * Input for convertToIncomeSections
 */
export interface ConvertToIncomeSectionsInput {
  /** business, other 用トランザクション */
  transactions: IncomeTransaction[];
  /** loan, grant 用トランザクション（counterpart 情報付き） */
  transactionsWithCounterpart: IncomeTransactionWithCounterpart[];
}

/**
 * Converts raw database transactions into income sections.
 *
 * Business rules:
 * - Transactions with categoryKey="publication-income" go to BusinessIncomeSection (SYUUSHI07_03)
 * - Transactions with categoryKey="loan-income" go to LoanIncomeSection (SYUUSHI07_04)
 * - Transactions with categoryKey="grant-income" go to GrantIncomeSection (SYUUSHI07_05)
 * - Transactions with categoryKey="other-income" go to OtherIncomeSection (SYUUSHI07_06)
 * - For OtherIncome, transactions >= 100,000 yen are listed individually
 * - For OtherIncome, transactions < 100,000 yen are aggregated
 */
export function convertToIncomeSections(
  input: ConvertToIncomeSectionsInput,
): IncomeData {
  const { transactions, transactionsWithCounterpart } = input;

  const toSectionTransaction = (t: IncomeTransaction): SectionTransaction => ({
    transactionNo: t.transactionNo,
    friendlyCategory: t.friendlyCategory,
    label: t.label,
    description: t.description,
    memo: t.memo,
    amount: resolveTransactionAmount(t.debitAmount, t.creditAmount),
  });

  const toSectionTransactionWithCounterpart = (
    t: IncomeTransactionWithCounterpart,
  ): SectionTransactionWithCounterpart => ({
    transactionNo: t.transactionNo,
    friendlyCategory: t.friendlyCategory,
    label: t.label,
    description: t.description,
    memo: t.memo,
    amount: resolveTransactionAmount(t.debitAmount, t.creditAmount),
    transactionDate: t.transactionDate,
    counterpartName: t.counterpartName,
    counterpartAddress: t.counterpartAddress,
  });

  const businessTransactions = transactions
    .filter(isBusinessIncomeTransaction)
    .map(toSectionTransaction);

  const loanTransactions = transactionsWithCounterpart
    .filter(isLoanIncomeTransaction)
    .map(toSectionTransactionWithCounterpart);

  const grantTransactions = transactionsWithCounterpart
    .filter(isGrantIncomeTransaction)
    .map(toSectionTransactionWithCounterpart);

  const otherTransactions = transactions
    .filter(isOtherIncomeTransaction)
    .map(toSectionTransaction);

  return {
    businessIncome:
      aggregateBusinessIncomeFromTransactions(businessTransactions),
    loanIncome: aggregateLoanIncomeFromTransactions(loanTransactions),
    grantIncome: aggregateGrantIncomeFromTransactions(grantTransactions),
    otherIncome: aggregateOtherIncomeFromTransactions(otherTransactions),
  };
}

// ============================================================
// Classification Functions
// ============================================================

interface HasCategoryKey {
  categoryKey: string | null;
}

function isBusinessIncomeTransaction(t: HasCategoryKey): boolean {
  return t.categoryKey === BUSINESS_INCOME_CATEGORY_KEY;
}

function isLoanIncomeTransaction(t: HasCategoryKey): boolean {
  return t.categoryKey === LOAN_INCOME_CATEGORY_KEY;
}

function isGrantIncomeTransaction(t: HasCategoryKey): boolean {
  return t.categoryKey === GRANT_INCOME_CATEGORY_KEY;
}

function isOtherIncomeTransaction(t: HasCategoryKey): boolean {
  return (
    !isBusinessIncomeTransaction(t) &&
    !isLoanIncomeTransaction(t) &&
    !isGrantIncomeTransaction(t)
  );
}

// ============================================================
// Pure Functions
// ============================================================

function aggregateBusinessIncomeFromTransactions(
  transactions: SectionTransaction[],
): BusinessIncomeSection {
  const totalAmount = transactions.reduce(
    (sum, transaction) => sum + transaction.amount,
    0,
  );

  const rows: BusinessIncomeRow[] = transactions.map((transaction, index) => ({
    ichirenNo: (index + 1).toString(),
    gigyouSyurui: buildGigyouSyurui(transaction),
    kingaku: Math.round(transaction.amount),
    bikou: buildBikou(transaction),
  }));

  return {
    totalAmount,
    rows,
  };
}

function buildGigyouSyurui(transaction: SectionTransaction): string {
  // ひとまずfriendlyCategory を事業の種類として使用
  return sanitizeText(
    transaction.friendlyCategory ||
      transaction.label ||
      transaction.description ||
      transaction.transactionNo,
    200,
  );
}

function aggregateLoanIncomeFromTransactions(
  transactions: SectionTransactionWithCounterpart[],
): LoanIncomeSection {
  const totalAmount = transactions.reduce(
    (sum, transaction) => sum + transaction.amount,
    0,
  );

  const rows: LoanIncomeRow[] = transactions.map((transaction, index) => ({
    ichirenNo: (index + 1).toString(),
    kariiresaki: buildKariiresaki(transaction),
    kingaku: Math.round(transaction.amount),
    bikou: buildBikou(transaction),
  }));

  return {
    totalAmount,
    rows,
  };
}

function buildKariiresaki(
  transaction: SectionTransactionWithCounterpart,
): string {
  // counterpartName を借入先として使用、なければフォールバック
  return sanitizeText(
    transaction.counterpartName ||
      transaction.label ||
      transaction.description ||
      transaction.transactionNo,
    200,
  );
}

function aggregateGrantIncomeFromTransactions(
  transactions: SectionTransactionWithCounterpart[],
): GrantIncomeSection {
  const totalAmount = transactions.reduce(
    (sum, transaction) => sum + transaction.amount,
    0,
  );

  const rows: GrantIncomeRow[] = transactions.map((transaction, index) => ({
    ichirenNo: (index + 1).toString(),
    honsibuNm: buildHonsibuNm(transaction),
    kingaku: Math.round(transaction.amount),
    dt: transaction.transactionDate ?? new Date(),
    jimuAdr: buildJimuAdr(transaction),
    bikou: buildBikou(transaction),
  }));

  return {
    totalAmount,
    rows,
  };
}

function buildHonsibuNm(
  transaction: SectionTransactionWithCounterpart,
): string {
  // counterpartName を本支部名称として使用
  return sanitizeText(
    transaction.counterpartName ||
      transaction.label ||
      transaction.description ||
      transaction.transactionNo,
    120,
  );
}

function buildJimuAdr(transaction: SectionTransactionWithCounterpart): string {
  // counterpartAddress を所在地として使用
  return sanitizeText(transaction.counterpartAddress || "", 80);
}

function aggregateOtherIncomeFromTransactions(
  transactions: SectionTransaction[],
): OtherIncomeSection {
  const totalAmount = transactions.reduce(
    (sum, transaction) => sum + transaction.amount,
    0,
  );

  const detailedRows = transactions.filter(
    (transaction) => transaction.amount >= TEN_MAN_THRESHOLD,
  );
  const underThresholdRows = transactions.filter(
    (transaction) => transaction.amount < TEN_MAN_THRESHOLD,
  );

  const underThresholdAmount = underThresholdRows.reduce(
    (sum, transaction) => sum + transaction.amount,
    0,
  );

  const rows: OtherIncomeRow[] = detailedRows.map((transaction, index) => ({
    ichirenNo: (index + 1).toString(),
    tekiyou: buildTekiyou(transaction),
    kingaku: Math.round(transaction.amount),
    bikou: buildBikou(transaction),
  }));

  return {
    totalAmount,
    underThresholdAmount,
    rows,
  };
}

function buildTekiyou(transaction: SectionTransaction): string {
  // タグ (friendlyCategory) を優先して使用
  return sanitizeText(
    transaction.friendlyCategory ||
      transaction.label ||
      transaction.description ||
      transaction.transactionNo,
    200,
  );
}

function buildBikou(transaction: SectionTransaction): string {
  const mfRowInfo = `MF行番号: ${transaction.transactionNo || "-"}`;
  const memoText = sanitizeText(transaction.memo, 160);
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
export {
  aggregateOtherIncomeFromTransactions,
  resolveTransactionAmount,
  type SectionTransaction,
};
