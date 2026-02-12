import "server-only";

import type { PoliticalOrganization } from "@/shared/models/political-organization";
import type { TransactionFilters } from "@/types/transaction-filters";
import type {
  DisplayTransaction,
  DisplayTransactionType,
} from "@/server/contexts/public-finance/domain/models/display-transaction";
import { convertToDisplayTransactions } from "@/server/contexts/public-finance/domain/models/display-transaction";
import type { IPoliticalOrganizationRepository } from "@/server/contexts/public-finance/domain/repositories/political-organization-repository.interface";
import type {
  ITransactionListRepository,
  PaginationOptions,
} from "@/server/contexts/public-finance/domain/repositories/transaction-list-repository.interface";

export interface GetTransactionsBySlugParams {
  slugs: string[];
  page?: number;
  perPage?: number;
  transactionType?: DisplayTransactionType;
  dateFrom?: Date;
  dateTo?: Date;
  financialYear: number;
  sortBy?: "date" | "amount";
  order?: "asc" | "desc";
  categories?: string[];
}

export interface GetTransactionsBySlugResult {
  transactions: DisplayTransaction[];
  total: number;
  totalAmount: number | null;
  page: number;
  perPage: number;
  totalPages: number;
  politicalOrganizations: PoliticalOrganization[];
  lastUpdatedAt: string | null;
}

export class GetTransactionsBySlugUsecase {
  constructor(
    private transactionRepository: ITransactionListRepository,
    private politicalOrganizationRepository: IPoliticalOrganizationRepository,
  ) {}

  async execute(params: GetTransactionsBySlugParams): Promise<GetTransactionsBySlugResult> {
    try {
      const politicalOrganizations = await this.politicalOrganizationRepository.findBySlugs(
        params.slugs,
      );

      if (politicalOrganizations.length === 0) {
        throw new Error(
          `Political organizations with slugs "${params.slugs.join(", ")}" not found`,
        );
      }

      const page = Math.max(params.page || 1, 1);
      const perPage = Math.min(Math.max(params.perPage || 50, 1), 100);

      const organizationIds = politicalOrganizations.map((org) => org.id);
      const filters: TransactionFilters = {
        political_organization_ids: organizationIds,
      };

      if (params.transactionType) {
        filters.transaction_type = params.transactionType;
      }
      if (params.dateFrom) {
        filters.date_from = params.dateFrom;
      }
      if (params.dateTo) {
        filters.date_to = params.dateTo;
      }
      if (params.categories && params.categories.length > 0) {
        filters.category_keys = params.categories;
      }
      filters.financial_year = params.financialYear;

      const pagination: PaginationOptions = {
        page,
        perPage,
        sortBy: params.sortBy,
        order: params.order,
      };

      const hasCategoryFilter = params.categories && params.categories.length > 0;

      const [transactionResult, lastUpdatedAt, totalAmount] = await Promise.all([
        this.transactionRepository.findWithPagination(filters, pagination),
        this.transactionRepository.getLastUpdatedAt(),
        hasCategoryFilter
          ? this.transactionRepository.getTotalAmount(filters)
          : Promise.resolve(null),
      ]);

      const transactions = convertToDisplayTransactions(transactionResult.items);
      const total = transactionResult.total;
      const totalPages = Math.ceil(total / perPage);

      return {
        transactions,
        total,
        totalAmount,
        page,
        perPage,
        totalPages,
        politicalOrganizations,
        lastUpdatedAt: lastUpdatedAt?.toISOString() ?? null,
      };
    } catch (error) {
      throw new Error(
        `Failed to get transactions by slug: ${error instanceof Error ? error.message : "Unknown error"}`,
      );
    }
  }
}
