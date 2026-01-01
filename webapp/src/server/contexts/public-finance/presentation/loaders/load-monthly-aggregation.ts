import "server-only";

import { prisma } from "@/server/lib/prisma";
import { PrismaMonthlyAggregationRepository } from "@/server/contexts/public-finance/infrastructure/repositories/prisma-monthly-aggregation.repository";
import { PrismaPoliticalOrganizationRepository } from "@/server/contexts/public-finance/infrastructure/repositories/prisma-political-organization.repository";
import { GetMonthlyAggregationUsecase } from "@/server/contexts/public-finance/application/usecases/get-monthly-aggregation-usecase";

export interface LoadMonthlyAggregationParams {
  slugs: string[];
  financialYear: number;
}

/**
 * 月別収支集計データをロードする
 *
 * リポジトリ実装をインスタンス化し、ユースケースを実行する。
 */
export async function loadMonthlyAggregation(params: LoadMonthlyAggregationParams) {
  const monthlyAggregationRepository = new PrismaMonthlyAggregationRepository(prisma);
  const politicalOrganizationRepository = new PrismaPoliticalOrganizationRepository(prisma);

  const usecase = new GetMonthlyAggregationUsecase(
    monthlyAggregationRepository,
    politicalOrganizationRepository,
  );

  return await usecase.execute(params);
}
