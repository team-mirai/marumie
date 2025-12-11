import type {
  IncomeTransaction,
  IncomeTransactionWithCounterpart,
} from "../../domain/converters/income-converter";

export interface IncomeTransactionFilters {
  politicalOrganizationId: string;
  financialYear: number;
}

export interface IReportTransactionRepository {
  /**
   * business, other 用のトランザクションを取得（counterpart なし）
   */
  findIncomeTransactions(
    filters: IncomeTransactionFilters,
  ): Promise<IncomeTransaction[]>;

  /**
   * loan, grant 用のトランザクションを取得（counterpart あり）
   */
  findIncomeTransactionsWithCounterpart(
    filters: IncomeTransactionFilters,
  ): Promise<IncomeTransactionWithCounterpart[]>;
}

// Re-export for consumers
export type { IncomeTransaction, IncomeTransactionWithCounterpart };
