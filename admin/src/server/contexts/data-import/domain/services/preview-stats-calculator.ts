import type { PreviewTransaction } from "@/server/contexts/data-import/domain/models/preview-transaction";

export interface TransactionTypeStats {
  count: number;
  amount: number;
}

export interface PreviewSummary {
  totalCount: number;
  insertCount: number;
  updateCount: number;
  invalidCount: number;
  skipCount: number;
}

export interface PreviewStatistics {
  insert: {
    income: TransactionTypeStats;
    expense: TransactionTypeStats;
    non_cash_journal: TransactionTypeStats;
    offset_income: TransactionTypeStats;
    offset_expense: TransactionTypeStats;
  };
  update: {
    income: TransactionTypeStats;
    expense: TransactionTypeStats;
    non_cash_journal: TransactionTypeStats;
    offset_income: TransactionTypeStats;
    offset_expense: TransactionTypeStats;
  };
  invalid: {
    income: TransactionTypeStats;
    expense: TransactionTypeStats;
    non_cash_journal: TransactionTypeStats;
    offset_income: TransactionTypeStats;
    offset_expense: TransactionTypeStats;
  };
  skip: {
    income: TransactionTypeStats;
    expense: TransactionTypeStats;
    non_cash_journal: TransactionTypeStats;
    offset_income: TransactionTypeStats;
    offset_expense: TransactionTypeStats;
  };
}

export function createEmptyPreviewStatistics(): PreviewStatistics {
  return {
    insert: {
      income: { count: 0, amount: 0 },
      expense: { count: 0, amount: 0 },
      non_cash_journal: { count: 0, amount: 0 },
      offset_income: { count: 0, amount: 0 },
      offset_expense: { count: 0, amount: 0 },
    },
    update: {
      income: { count: 0, amount: 0 },
      expense: { count: 0, amount: 0 },
      non_cash_journal: { count: 0, amount: 0 },
      offset_income: { count: 0, amount: 0 },
      offset_expense: { count: 0, amount: 0 },
    },
    invalid: {
      income: { count: 0, amount: 0 },
      expense: { count: 0, amount: 0 },
      non_cash_journal: { count: 0, amount: 0 },
      offset_income: { count: 0, amount: 0 },
      offset_expense: { count: 0, amount: 0 },
    },
    skip: {
      income: { count: 0, amount: 0 },
      expense: { count: 0, amount: 0 },
      non_cash_journal: { count: 0, amount: 0 },
      offset_income: { count: 0, amount: 0 },
      offset_expense: { count: 0, amount: 0 },
    },
  };
}

export function calculatePreviewStatistics(transactions: PreviewTransaction[]): PreviewStatistics {
  const statistics = createEmptyPreviewStatistics();

  for (const transaction of transactions) {
    const status = transaction.status;
    const transactionType = transaction.transaction_type;

    if (transactionType === null) {
      continue;
    }

    statistics[status][transactionType].count += 1;

    const amount =
      transactionType === "income" || transactionType === "offset_income"
        ? transaction.credit_amount
        : transaction.debit_amount;
    statistics[status][transactionType].amount += amount;
  }

  return statistics;
}

export function calculatePreviewSummary(transactions: PreviewTransaction[]): PreviewSummary {
  return {
    totalCount: transactions.length,
    insertCount: transactions.filter((t) => t.status === "insert").length,
    updateCount: transactions.filter((t) => t.status === "update").length,
    invalidCount: transactions.filter((t) => t.status === "invalid").length,
    skipCount: transactions.filter((t) => t.status === "skip").length,
  };
}
