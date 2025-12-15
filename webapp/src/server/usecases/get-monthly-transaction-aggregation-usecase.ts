import type { IPoliticalOrganizationRepository } from "../repositories/interfaces/political-organization-repository.interface";
import type {
  ITransactionRepository,
  MonthlyAggregation,
} from "../repositories/interfaces/transaction-repository.interface";

export interface GetMonthlyTransactionAggregationParams {
  slugs: string[];
  financialYear: number;
}

export interface GetMonthlyTransactionAggregationResult {
  monthlyData: MonthlyAggregation[];
}

export class GetMonthlyTransactionAggregationUsecase {
  constructor(
    private transactionRepository: ITransactionRepository,
    private politicalOrganizationRepository: IPoliticalOrganizationRepository,
  ) {}

  async execute(
    params: GetMonthlyTransactionAggregationParams,
  ): Promise<GetMonthlyTransactionAggregationResult> {
    try {
      const politicalOrganizations = await this.politicalOrganizationRepository.findBySlugs(
        params.slugs,
      );

      if (politicalOrganizations.length === 0) {
        throw new Error(
          `Political organizations with slugs "${params.slugs.join(", ")}" not found`,
        );
      }

      // Get monthly data for all organizations using IN clause
      const organizationIds = politicalOrganizations.map((org) => org.id);
      const monthlyData = await this.transactionRepository.getMonthlyAggregation(
        organizationIds,
        params.financialYear,
      );

      return { monthlyData };
    } catch (error) {
      throw new Error(
        `Failed to get monthly transaction aggregation: ${error instanceof Error ? error.message : "Unknown error"}`,
      );
    }
  }
}
