import "server-only";

import type { ITransactionWithCounterpartRepository } from "@/server/contexts/report/domain/repositories/report-transaction-repository.interface";
import type {
  TransactionWithCounterpart,
  TransactionWithCounterpartFilters,
} from "@/server/contexts/report/domain/models/transaction-with-counterpart";

export interface GetTransactionsWithCounterpartsInput {
  politicalOrganizationId: string;
  financialYear: number;
  unassignedOnly?: boolean;
  requiresCounterpartOnly?: boolean;
  categoryKey?: string;
  searchQuery?: string;
  page?: number;
  perPage?: number;
  sortField?: "transactionDate" | "debitAmount" | "categoryKey";
  sortOrder?: "asc" | "desc";
}

export interface GetTransactionsWithCounterpartsResult {
  transactions: TransactionWithCounterpart[];
  total: number;
  page: number;
  perPage: number;
}

/**
 * Counterpart紐づけ対象の取引一覧を取得する
 */
export class GetTransactionsWithCounterpartsUsecase {
  constructor(private repository: ITransactionWithCounterpartRepository) {}

  async execute(
    input: GetTransactionsWithCounterpartsInput,
  ): Promise<GetTransactionsWithCounterpartsResult> {
    const page = input.page ?? 1;
    const perPage = input.perPage ?? 50;
    const offset = (page - 1) * perPage;

    const filters: TransactionWithCounterpartFilters = {
      politicalOrganizationId: input.politicalOrganizationId,
      financialYear: input.financialYear,
      unassignedOnly: input.unassignedOnly,
      requiresCounterpartOnly: input.requiresCounterpartOnly,
      categoryKey: input.categoryKey,
      searchQuery: input.searchQuery,
      limit: perPage,
      offset,
      sortField: input.sortField,
      sortOrder: input.sortOrder,
    };

    const result = await this.repository.findTransactionsWithCounterparts(filters);

    return {
      transactions: result.transactions,
      total: result.total,
      page,
      perPage,
    };
  }
}
