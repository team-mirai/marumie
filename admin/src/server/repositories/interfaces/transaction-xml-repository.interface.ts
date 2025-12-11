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

export interface IncomeTransactionFilters {
  politicalOrganizationId: string;
  financialYear: number;
}

export interface ITransactionXmlRepository {
  findIncomeTransactions(
    filters: IncomeTransactionFilters,
  ): Promise<IncomeTransaction[]>;
}
