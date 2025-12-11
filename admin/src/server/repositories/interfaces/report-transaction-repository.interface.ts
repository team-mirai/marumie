import type { IncomeTransaction } from "../../domain/converters/income-converter";

export interface IncomeTransactionFilters {
  politicalOrganizationId: string;
  financialYear: number;
}

export interface IReportTransactionRepository {
  findIncomeTransactions(
    filters: IncomeTransactionFilters,
  ): Promise<IncomeTransaction[]>;
}

// Re-export for consumers
export type { IncomeTransaction };
