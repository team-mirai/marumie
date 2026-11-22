import "server-only";

import type { MonthlyAggregation } from "@/server/contexts/public-finance/domain/models/monthly-aggregation";
import { aggregateFromAccountTotals } from "@/server/contexts/public-finance/domain/services/monthly-net-aggregator";
import type { IMonthlyAggregationRepository } from "@/server/contexts/public-finance/domain/repositories/monthly-aggregation-repository.interface";
import type { IPoliticalOrganizationRepository } from "@/server/contexts/public-finance/domain/repositories/political-organization-repository.interface";

interface GetMonthlyAggregationParams {
  slugs: string[];
  financialYear: number;
}

interface GetMonthlyAggregationResult {
  monthlyData: MonthlyAggregation[];
}

/**
 * 月別収支集計を取得するユースケース
 *
 * リポジトリから月・勘定科目ごとの借方・貸方の合計を取得し、
 * ドメインサービスで収入・支出への分類とマージ・ソートを行う。
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

      const [creditTotals, debitTotals] = await Promise.all([
        this.monthlyAggregationRepository.getCreditTotalsByOrganizationIds(
          organizationIds,
          params.financialYear,
        ),
        this.monthlyAggregationRepository.getDebitTotalsByOrganizationIds(
          organizationIds,
          params.financialYear,
        ),
      ]);

      const monthlyData = aggregateFromAccountTotals(
        creditTotals,
        debitTotals,
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
