/**
 * Other Income Converter
 *
 * Converts raw transaction data from the database into the OtherIncomeSection domain object.
 * This is a pure function layer that handles data transformation and business rules.
 */

const TEN_MAN_THRESHOLD = 100_000;

// ============================================================
// Input Types (from DB/Repository)
// ============================================================

export interface OtherIncomeTransaction {
  transactionNo: string;
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

export interface OtherIncomeRow {
  ichirenNo: string;
  tekiyou: string;
  kingaku: number;
  bikou?: string;
}

export interface OtherIncomeSection {
  totalAmount: number;
  underThresholdAmount: number | null;
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

// ============================================================
// Converter Function
// ============================================================

/**
 * Converts raw database transactions into an OtherIncomeSection.
 *
 * Business rules:
 * - Transactions >= 100,000 yen are listed individually with details
 * - Transactions < 100,000 yen are aggregated into underThresholdAmount
 */
export function convertToOtherIncomeSection(
  transactions: OtherIncomeTransaction[],
): OtherIncomeSection {
  const sectionTransactions: SectionTransaction[] = transactions.map((t) => ({
    transactionNo: t.transactionNo,
    friendlyCategory: t.friendlyCategory,
    label: t.label,
    description: t.description,
    memo: t.memo,
    amount: resolveTransactionAmount(t.debitAmount, t.creditAmount),
  }));

  return aggregateOtherIncomeFromTransactions(sectionTransactions);
}

// ============================================================
// Pure Functions
// ============================================================

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
    underThresholdAmount:
      underThresholdAmount > 0 ? underThresholdAmount : null,
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
