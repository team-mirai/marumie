import type { MonthlyAggregation } from "@/server/contexts/public-finance/domain/models/monthly-aggregation";
import type { IMonthlyAggregationRepository } from "@/server/contexts/public-finance/domain/repositories/monthly-aggregation-repository.interface";
import type { IPoliticalOrganizationRepository } from "@/server/contexts/public-finance/domain/repositories/political-organization-repository.interface";

export interface GetMonthlyAggregationParams {
  slugs: string[];
  financialYear: number;
}

export interface GetMonthlyAggregationResult {
  monthlyData: MonthlyAggregation[];
}

/**
 * 月別収支集計を取得するユースケース
 *
 * ITransactionRepository への依存を IMonthlyAggregationRepository に変更し、
 * Interface Segregation Principle を適用。
 */
export class GetMonthlyAggregationUsecase {
  constructor(
    private monthlyAggregationRepository: IMonthlyAggregationRepository,
    private politicalOrganizationRepository: IPoliticalOrganizationRepository,
  ) {}

  async execute(params: GetMonthlyAggregationParams): Promise<GetMonthlyAggregationResult> {
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
      const monthlyData = await this.monthlyAggregationRepository.getByOrganizationIds(
        organizationIds,
        params.financialYear,
      );

      return { monthlyData };
    } catch (error) {
      throw new Error(
        `Failed to get monthly aggregation: ${error instanceof Error ? error.message : "Unknown error"}`,
      );
    }
  }
}
