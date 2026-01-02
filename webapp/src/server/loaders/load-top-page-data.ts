import "server-only";

import { unstable_cache } from "next/cache";
import { prisma } from "@/server/lib/prisma";
import { PrismaPoliticalOrganizationRepository } from "@/server/contexts/public-finance/infrastructure/repositories/prisma-political-organization.repository";
import { PrismaMonthlyAggregationRepository } from "@/server/contexts/public-finance/infrastructure/repositories/prisma-monthly-aggregation.repository";
import { PrismaBalanceSheetRepository } from "@/server/contexts/public-finance/infrastructure/repositories/prisma-balance-sheet.repository";
import { GetMonthlyAggregationUsecase } from "@/server/contexts/public-finance/application/usecases/get-monthly-aggregation-usecase";
import { GetBalanceSheetUsecase } from "@/server/contexts/public-finance/application/usecases/get-balance-sheet-usecase";
import { PrismaTransactionRepository } from "@/server/repositories/prisma-transaction.repository";
import { PrismaBalanceSnapshotRepository } from "@/server/repositories/prisma-balance-snapshot.repository";
import { GetMockTransactionPageDataUsecase } from "@/server/usecases/get-mock-transaction-page-data-usecase";
import { GetSankeyAggregationUsecase } from "@/server/usecases/get-sankey-aggregation-usecase";
import {
  type GetTransactionsBySlugParams,
  GetTransactionsBySlugUsecase,
} from "@/server/contexts/public-finance/application/usecases/get-transactions-by-slug-usecase";
import { CACHE_REVALIDATE_SECONDS } from "./constants";

export interface TopPageDataParams extends Omit<GetTransactionsBySlugParams, "financialYear"> {
  financialYear: number; // 必須項目として設定
}

export const loadTopPageData = unstable_cache(
  async (params: TopPageDataParams) => {
    // モックデータを使用する場合
    if (process.env.USE_MOCK_DATA === "true") {
      const mockUsecase = new GetMockTransactionPageDataUsecase();
      return await mockUsecase.execute(params);
    }

    // 実データを取得する場合
    const transactionRepository = new PrismaTransactionRepository(prisma);
    const politicalOrganizationRepository = new PrismaPoliticalOrganizationRepository(prisma);
    const balanceSnapshotRepository = new PrismaBalanceSnapshotRepository(prisma);
    const monthlyAggregationRepository = new PrismaMonthlyAggregationRepository(prisma);
    const balanceSheetRepository = new PrismaBalanceSheetRepository(prisma);

    // Usecaseを初期化
    const transactionUsecase = new GetTransactionsBySlugUsecase(
      transactionRepository,
      politicalOrganizationRepository,
    );

    const sankeyUsecase = new GetSankeyAggregationUsecase(
      transactionRepository,
      politicalOrganizationRepository,
      balanceSnapshotRepository,
      balanceSheetRepository,
    );

    const balanceSheetUsecase = new GetBalanceSheetUsecase(
      balanceSheetRepository,
      politicalOrganizationRepository,
    );

    const monthlyAggregationUsecase = new GetMonthlyAggregationUsecase(
      monthlyAggregationRepository,
      politicalOrganizationRepository,
    );

    // データ取得を2段階に分けて実行することで、データベースコネクションプールへの同時接続数を削減
    // 全てを同時実行するとコネクション上限に達する可能性があるため、段階的に実行する

    // 第1段階: transaction、monthly、balanceSheetを並列実行
    const [transactionData, monthlyData, balanceSheetData] = await Promise.all([
      transactionUsecase.execute(params),
      monthlyAggregationUsecase.execute({
        slugs: params.slugs,
        financialYear: params.financialYear,
      }),
      balanceSheetUsecase.execute({
        slugs: params.slugs,
        financialYear: params.financialYear,
      }),
    ]);

    // 第2段階: sankeyの2種類を並列実行
    const [sankeyPoliticalCategoryData, sankeyFriendlyCategoryData] = await Promise.all([
      sankeyUsecase.execute({
        slugs: params.slugs,
        financialYear: params.financialYear,
        categoryType: "political-category",
      }),
      sankeyUsecase.execute({
        slugs: params.slugs,
        financialYear: params.financialYear,
        categoryType: "friendly-category",
      }),
    ]);

    return {
      transactionData,
      monthlyData: monthlyData.monthlyData,
      political: sankeyPoliticalCategoryData.sankeyData,
      friendly: sankeyFriendlyCategoryData.sankeyData,
      balanceSheetData: balanceSheetData.balanceSheetData,
    };
  },
  ["top-page-data"],
  { revalidate: CACHE_REVALIDATE_SECONDS },
);
