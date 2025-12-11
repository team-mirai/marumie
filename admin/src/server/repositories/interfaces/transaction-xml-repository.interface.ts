export interface BusinessIncomeTransaction {
  transactionNo: string;
  friendlyCategory: string | null;
  label: string | null;
  description: string | null;
  memo: string | null;
  debitAmount: number;
  creditAmount: number;
}

export interface BusinessIncomeTransactionFilters {
  politicalOrganizationId: string;
  financialYear: number;
}

export interface OtherIncomeTransaction {
  transactionNo: string;
  friendlyCategory: string | null;
  label: string | null;
  description: string | null;
  memo: string | null;
  debitAmount: number;
  creditAmount: number;
}

export interface OtherIncomeTransactionFilters {
  politicalOrganizationId: string;
  financialYear: number;
}

export interface ITransactionXmlRepository {
  findBusinessIncomeTransactions(
    filters: BusinessIncomeTransactionFilters,
  ): Promise<BusinessIncomeTransaction[]>;

  findOtherIncomeTransactions(
    filters: OtherIncomeTransactionFilters,
  ): Promise<OtherIncomeTransaction[]>;
}
