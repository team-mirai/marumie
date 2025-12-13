import type {
  TransactionFilters,
  TransactionWithOrganization,
} from "@/server/contexts/shared/domain/transaction";
import type {
  ITransactionRepository,
  PaginationOptions,
} from "@/server/contexts/shared/infrastructure/repositories/interfaces/transaction-repository.interface";

export interface GetTransactionsParams {
  page?: number;
  perPage?: number;
  politicalOrganizationIds?: string[];
  transactionType?: "income" | "expense";
  dateFrom?: Date;
  dateTo?: Date;
  financialYear?: number;
}

export interface GetTransactionsResult {
  transactions: TransactionWithOrganization[];
  total: number;
  page: number;
  perPage: number;
  totalPages: number;
}

export class GetTransactionsUsecase {
  constructor(private repository: ITransactionRepository) {}

  async execute(
    params: GetTransactionsParams = {},
  ): Promise<GetTransactionsResult> {
    try {
      const page = Math.max(params.page || 1, 1);
      const perPage = Math.min(Math.max(params.perPage || 50, 1), 100);

      const filters: TransactionFilters = {};
      if (
        params.politicalOrganizationIds &&
        params.politicalOrganizationIds.length > 0
      ) {
        filters.political_organization_ids = params.politicalOrganizationIds;
      }
      if (params.transactionType) {
        filters.transaction_type = params.transactionType;
      }
      if (params.dateFrom) {
        filters.date_from = params.dateFrom;
      }
      if (params.dateTo) {
        filters.date_to = params.dateTo;
      }
      if (params.financialYear) {
        filters.financial_year = params.financialYear;
      }

      const pagination: PaginationOptions = {
        page,
        perPage,
      };

      const result = await this.repository.findWithPagination(
        filters,
        pagination,
      );

      return {
        transactions: result.items,
        total: result.total,
        page: result.page,
        perPage: result.perPage,
        totalPages: result.totalPages,
      };
    } catch (error) {
      throw new Error(
        `Failed to get transactions: ${error instanceof Error ? error.message : "Unknown error"}`,
      );
    }
  }
}
