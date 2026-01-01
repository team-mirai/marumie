import "server-only";

import type { ITransactionWithDonorRepository } from "@/server/contexts/report/domain/repositories/transaction-with-donor-repository.interface";
import type {
  TransactionWithDonor,
  TransactionWithDonorFilters,
} from "@/server/contexts/report/domain/models/transaction-with-donor";

export interface GetTransactionsWithDonorsInput {
  politicalOrganizationId: string;
  financialYear: number;
  unassignedOnly?: boolean;
  categoryKey?: string;
  searchQuery?: string;
  page?: number;
  perPage?: number;
  sortField?: "transactionDate" | "debitAmount" | "categoryKey";
  sortOrder?: "asc" | "desc";
}

export interface GetTransactionsWithDonorsResult {
  transactions: TransactionWithDonor[];
  total: number;
  page: number;
  perPage: number;
}

export class GetTransactionsWithDonorsUsecase {
  constructor(private repository: ITransactionWithDonorRepository) {}

  async execute(input: GetTransactionsWithDonorsInput): Promise<GetTransactionsWithDonorsResult> {
    const page = Math.max(1, input.page ?? 1);
    const perPage = Math.max(1, Math.min(100, input.perPage ?? 50));
    const offset = (page - 1) * perPage;

    const filters: TransactionWithDonorFilters = {
      politicalOrganizationId: input.politicalOrganizationId,
      financialYear: input.financialYear,
      unassignedOnly: input.unassignedOnly,
      categoryKey: input.categoryKey,
      searchQuery: input.searchQuery,
      limit: perPage,
      offset,
      sortField: input.sortField,
      sortOrder: input.sortOrder,
    };

    const result = await this.repository.findTransactionsWithDonors(filters);

    return {
      transactions: result.transactions,
      total: result.total,
      page,
      perPage,
    };
  }
}
