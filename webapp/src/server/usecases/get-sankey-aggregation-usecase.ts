import type { SankeyData } from "@/types/sankey";
import type { IPoliticalOrganizationRepository } from "../repositories/interfaces/political-organization-repository.interface";
import type { ITransactionRepository } from "../repositories/interfaces/transaction-repository.interface";
import type { IBalanceSnapshotRepository } from "../repositories/interfaces/balance-snapshot-repository.interface";
import { convertCategoryAggregationToSankeyData } from "../utils/sankey-category-converter";

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
  ) {}

  async execute(params: GetSankeyAggregationParams): Promise<GetSankeyAggregationResult> {
    try {
      // 政治団体を取得
      const politicalOrganizations = await this.politicalOrganizationRepository.findBySlugs(
        params.slugs,
      );

      if (politicalOrganizations.length === 0) {
        throw new Error(
          `Political organizations with slugs "${params.slugs.join(", ")}" not found`,
        );
      }

      // 集計データを取得（IN句で効率的に）
      const organizationIds = politicalOrganizations.map((org) => org.id);
      const aggregatedResult = await this.transactionRepository.getCategoryAggregationForSankey(
        organizationIds,
        params.financialYear,
        params.categoryType,
      );

      // 今年と昨年の最新残高データを取得（合計値）
      const organizationIdsAsString = organizationIds.map((id) => id.toString());
      const [balancesByYear, liabilityBalance] = await Promise.all([
        this.balanceSnapshotRepository.getTotalLatestBalancesByYear(
          organizationIdsAsString,
          params.financialYear,
        ),
        this.transactionRepository.getLiabilityBalance(
          organizationIdsAsString,
          params.financialYear,
        ),
      ]);

      // Sankeyデータに変換
      const isFriendlyCategory = params.categoryType === "friendly-category";
      const sankeyData = convertCategoryAggregationToSankeyData(
        aggregatedResult,
        isFriendlyCategory,
        balancesByYear.currentYear,
        balancesByYear.previousYear,
        liabilityBalance,
      );

      return { sankeyData };
    } catch (error) {
      throw new Error(
        `Failed to get sankey aggregation: ${error instanceof Error ? error.message : "Unknown error"}`,
      );
    }
  }
}
