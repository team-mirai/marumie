import "server-only";

import {
  type MonthlyAggregation,
  aggregateFromTotals,
} from "@/server/contexts/public-finance/domain/models/monthly-aggregation";
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
 * リポジトリから収入・支出の生データを取得し、
 * ドメインモデルでマージ・ソートを行う。
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

      const [incomeData, expenseData] = await Promise.all([
        this.monthlyAggregationRepository.getIncomeByOrganizationIds(
          organizationIds,
          params.financialYear,
        ),
        this.monthlyAggregationRepository.getExpenseByOrganizationIds(
          organizationIds,
          params.financialYear,
        ),
      ]);

      const monthlyData = aggregateFromTotals(incomeData, expenseData, params.financialYear);

      return { monthlyData };
    } catch (error) {
      throw new Error(
        `Failed to get monthly aggregation: ${error instanceof Error ? error.message : "Unknown error"}`,
      );
    }
  }
}
