import type { Transaction } from "@/shared/models/transaction";
import type { TransactionFilters } from "@/types/transaction-filters";
import type { IPoliticalOrganizationRepository } from "@/server/contexts/public-finance/domain/repositories/political-organization-repository.interface";
import type { ITransactionRepository } from "../repositories/interfaces/transaction-repository.interface";

export interface GetTransactionsForCsvParams {
  slugs: string[];
  financialYear: number;
}

export interface GetTransactionsForCsvResult {
  transactions: Array<Transaction & { political_organization_name: string }>;
  total: number;
}

export class GetTransactionsForCsvUsecase {
  constructor(
    private transactionRepository: ITransactionRepository,
    private politicalOrganizationRepository: IPoliticalOrganizationRepository,
  ) {}

  async execute(params: GetTransactionsForCsvParams): Promise<GetTransactionsForCsvResult> {
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
        financial_year: params.financialYear,
      };

      // JOINで政治団体名も含めて全件取得
      const transactions =
        await this.transactionRepository.findAllWithPoliticalOrganizationName(filters);

      const total = transactions.length;

      return {
        transactions,
        total,
      };
    } catch (error) {
      throw new Error(
        `Failed to get transactions for CSV: ${error instanceof Error ? error.message : "Unknown error"}`,
      );
    }
  }
}
