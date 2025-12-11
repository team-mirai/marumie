/**
 * Income Converter
 *
 * Converts raw transaction data from the database into income-related domain objects.
 * This is a pure function layer that handles data transformation and business rules.
 */

const TEN_MAN_THRESHOLD = 100_000;

// Category keys for classification
const BUSINESS_INCOME_CATEGORY_KEY = "publication-income";

// ============================================================
// Input Types (from DB/Repository)
// ============================================================

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

/**
 * Combined result of income conversion
 */
export interface IncomeSections {
  businessIncome: BusinessIncomeSection;
  otherIncome: OtherIncomeSection;
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

// ============================================================
// Converter Functions
// ============================================================

/**
 * Converts raw database transactions into both BusinessIncomeSection and OtherIncomeSection.
 *
 * Business rules:
 * - Transactions with categoryKey="publication-income" go to BusinessIncomeSection
 * - Transactions with categoryKey="other-income" go to OtherIncomeSection
 * - For OtherIncome, transactions >= 100,000 yen are listed individually
 * - For OtherIncome, transactions < 100,000 yen are aggregated
 */
export function convertToIncomeSections(
  transactions: IncomeTransaction[],
): IncomeSections {
  const toSectionTransaction = (t: IncomeTransaction): SectionTransaction => ({
    transactionNo: t.transactionNo,
    friendlyCategory: t.friendlyCategory,
    label: t.label,
    description: t.description,
    memo: t.memo,
    amount: resolveTransactionAmount(t.debitAmount, t.creditAmount),
  });

  const businessTransactions = transactions
    .filter(isBusinessIncomeTransaction)
    .map(toSectionTransaction);

  const otherTransactions = transactions
    .filter((t) => !isBusinessIncomeTransaction(t))
    .map(toSectionTransaction);

  return {
    businessIncome:
      aggregateBusinessIncomeFromTransactions(businessTransactions),
    otherIncome: aggregateOtherIncomeFromTransactions(otherTransactions),
  };
}

// ============================================================
// Classification Functions
// ============================================================

function isBusinessIncomeTransaction(t: IncomeTransaction): boolean {
  return t.categoryKey === BUSINESS_INCOME_CATEGORY_KEY;
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
