import "server-only";

import type { SankeyData } from "@/server/contexts/public-finance/domain/models/sankey-data";
import type { IPoliticalOrganizationRepository } from "@/server/contexts/public-finance/domain/repositories/political-organization-repository.interface";
import type { IBalanceSheetRepository } from "@/server/contexts/public-finance/domain/repositories/balance-sheet-repository.interface";
import type { ITransactionRepository } from "@/server/contexts/public-finance/domain/repositories/transaction-repository.interface";
import type { IBalanceSnapshotRepository } from "@/server/contexts/public-finance/domain/repositories/balance-snapshot-repository.interface";
import {
  CategoryAggregation,
  DEFAULT_SUBCATEGORY_MAX_COUNT,
} from "@/server/contexts/public-finance/domain/models/category-aggregation";
import { SankeyDataBuilder } from "@/server/contexts/public-finance/domain/services/sankey-data-builder";

export interface GetSankeyAggregationParams {
  slugs: string[];
  financialYear: number;
  categoryType?: "political-category" | "friendly-category";
}

export interface GetSankeyAggregationResult {
  sankeyData: SankeyData;
}

export class GetSankeyAggregationUsecase {
  constructor(
    private transactionRepository: ITransactionRepository,
    private politicalOrganizationRepository: IPoliticalOrganizationRepository,
    private balanceSnapshotRepository: IBalanceSnapshotRepository,
    private balanceSheetRepository: IBalanceSheetRepository,
  ) {}

  async execute(params: GetSankeyAggregationParams): Promise<GetSankeyAggregationResult> {
    try {
      // 1. 政治団体を取得
      const politicalOrganizations = await this.politicalOrganizationRepository.findBySlugs(
        params.slugs,
      );

      if (politicalOrganizations.length === 0) {
        throw new Error(
          `Political organizations with slugs "${params.slugs.join(", ")}" not found`,
        );
      }

      const organizationIds = politicalOrganizations.map((org) => org.id);
      const isFriendlyCategory = params.categoryType === "friendly-category";

      // 2. データを並列取得
      const organizationIdsAsString = organizationIds.map((id) => id.toString());
      const [rawAggregation, balancesByYear, liabilityBalance] = await Promise.all([
        this.transactionRepository.getCategoryAggregationForSankey(
          organizationIds,
          params.financialYear,
          params.categoryType,
        ),
        this.balanceSnapshotRepository.getTotalLatestBalancesByYear(
          organizationIdsAsString,
          params.financialYear,
        ),
        this.balanceSheetRepository.getCurrentLiabilities(
          organizationIdsAsString,
          params.financialYear,
        ),
      ]);

      // 3. ドメインモデルで変換処理
      let aggregation = CategoryAggregation.renameOtherCategories(rawAggregation);

      if (isFriendlyCategory) {
        aggregation = CategoryAggregation.consolidateSmallItems(aggregation, {
          targetMaxCount: DEFAULT_SUBCATEGORY_MAX_COUNT,
        });
      }

      aggregation = CategoryAggregation.adjustWithBalance(
        aggregation,
        {
          previousYearBalance: balancesByYear.previousYear,
          currentYearBalance: balancesByYear.currentYear,
          liabilityBalance,
        },
        { isFriendlyCategory },
      );

      // 4. ドメインサービスでSankeyDataを構築
      const builder = new SankeyDataBuilder();
      const sankeyData = builder.build(aggregation);

      return { sankeyData };
    } catch (error) {
      throw new Error(
        `Failed to get sankey aggregation: ${error instanceof Error ? error.message : "Unknown error"}`,
      );
    }
  }
}
