import "server-only";

import type { PoliticalOrganization } from "@/shared/models/political-organization";
import type { TransactionFilters } from "@/types/transaction-filters";
import type { DisplayTransaction, DisplayTransactionType } from "@/types/display-transaction";
import type { IPoliticalOrganizationRepository } from "@/server/contexts/public-finance/domain/repositories/political-organization-repository.interface";
import type { ITransactionRepository } from "@/server/repositories/interfaces/transaction-repository.interface";
import { convertToDisplayTransactions } from "@/server/utils/transaction-converter";

export interface GetAllTransactionsBySlugParams {
  slugs: string[];
  transactionType?: DisplayTransactionType;
  dateFrom?: Date;
  dateTo?: Date;
  financialYear: number;
  sortBy?: "date" | "amount";
  order?: "asc" | "desc";
  categories?: string[];
}

export interface GetAllTransactionsBySlugResult {
  transactions: DisplayTransaction[];
  total: number;
  politicalOrganizations: PoliticalOrganization[];
  lastUpdatedAt: string | null;
}

export class GetAllTransactionsBySlugUsecase {
  constructor(
    private transactionRepository: ITransactionRepository,
    private politicalOrganizationRepository: IPoliticalOrganizationRepository,
  ) {}

  async execute(params: GetAllTransactionsBySlugParams): Promise<GetAllTransactionsBySlugResult> {
    try {
      const politicalOrganizations = await this.politicalOrganizationRepository.findBySlugs(
        params.slugs,
      );

      if (politicalOrganizations.length === 0) {
        throw new Error(
          `Political organizations with slugs "${params.slugs.join(", ")}" not found`,
        );
      }

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

      // 全件取得（ページネーションなし）
      const [transactionResult, lastUpdatedAt] = await Promise.all([
        this.transactionRepository.findAll(filters, {
          sortBy: params.sortBy,
          order: params.order,
        }),
        this.transactionRepository.getLastUpdatedAt(),
      ]);

      const transactions = convertToDisplayTransactions(transactionResult);
      const total = transactions.length;

      return {
        transactions,
        total,
        politicalOrganizations,
        lastUpdatedAt: lastUpdatedAt?.toISOString() ?? null,
      };
    } catch (error) {
      throw new Error(
        `Failed to get all transactions by slug: ${error instanceof Error ? error.message : "Unknown error"}`,
      );
    }
  }
}
