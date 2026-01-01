import "server-only";

import type { ITransactionWithCounterpartRepository } from "@/server/contexts/report/domain/repositories/report-transaction-repository.interface";
import type {
  TransactionWithCounterpart,
  TransactionByCounterpartFilters,
} from "@/server/contexts/report/domain/models/transaction-with-counterpart";

export interface GetCounterpartTransactionsInput {
  counterpartId: string;
  politicalOrganizationId?: string;
  financialYear?: number;
  page?: number;
  perPage?: number;
  sortField?: "transactionDate" | "debitAmount" | "categoryKey";
  sortOrder?: "asc" | "desc";
}

export interface GetCounterpartTransactionsResult {
  transactions: TransactionWithCounterpart[];
  total: number;
  page: number;
  perPage: number;
}

/**
 * 特定のカウンターパートに紐づいている取引一覧を取得する
 */
export class GetCounterpartTransactionsUsecase {
  constructor(private repository: ITransactionWithCounterpartRepository) {}

  async execute(input: GetCounterpartTransactionsInput): Promise<GetCounterpartTransactionsResult> {
    const page = Math.max(1, input.page ?? 1);
    const perPage = Math.max(1, Math.min(100, input.perPage ?? 50));
    const offset = (page - 1) * perPage;

    const filters: TransactionByCounterpartFilters = {
      counterpartId: input.counterpartId,
      politicalOrganizationId: input.politicalOrganizationId,
      financialYear: input.financialYear,
      limit: perPage,
      offset,
      sortField: input.sortField,
      sortOrder: input.sortOrder,
    };

    const result = await this.repository.findByCounterpart(filters);

    return {
      transactions: result.transactions,
      total: result.total,
      page,
      perPage,
    };
  }
}
