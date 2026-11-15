import "server-only";

import { unstable_cache } from "next/cache";
import { prisma } from "@/server/contexts/public-finance/infrastructure/prisma";
import { PrismaPoliticalOrganizationRepository } from "@/server/contexts/public-finance/infrastructure/repositories/prisma-political-organization.repository";
import { PrismaTransactionRepository } from "@/server/contexts/public-finance/infrastructure/repositories/prisma-transaction.repository";
import { PrismaBalanceSnapshotRepository } from "@/server/contexts/public-finance/infrastructure/repositories/prisma-balance-snapshot.repository";
import { PrismaBalanceSheetRepository } from "@/server/contexts/public-finance/infrastructure/repositories/prisma-balance-sheet.repository";
import { SupabaseOrganizationPhotoStorage } from "@/server/contexts/public-finance/infrastructure/storage/supabase-organization-photo-storage";
import { GetSankeyAggregationUsecase } from "@/server/contexts/public-finance/application/usecases/get-sankey-aggregation-usecase";
import { GetHomeOrganizationCardsUsecase } from "@/server/contexts/public-finance/application/usecases/get-home-organization-cards-usecase";
import { CACHE_REVALIDATE_SECONDS } from "./constants";

/** トップページの政党・政治団体の収支カードのデータ */
export const loadHomePageData = unstable_cache(
  async (years: readonly number[]) => {
    const transactionRepository = new PrismaTransactionRepository(prisma);
    const politicalOrganizationRepository = new PrismaPoliticalOrganizationRepository(prisma);
    const sankeyUsecase = new GetSankeyAggregationUsecase(
      transactionRepository,
      politicalOrganizationRepository,
      new PrismaBalanceSnapshotRepository(prisma),
      new PrismaBalanceSheetRepository(prisma),
    );
    const usecase = new GetHomeOrganizationCardsUsecase(
      politicalOrganizationRepository,
      transactionRepository,
      sankeyUsecase,
    );
    return await usecase.execute({
      years,
      photoStorageAvailable: SupabaseOrganizationPhotoStorage.fromEnv() !== null,
    });
  },
  ["home-page-data"],
  // 政治団体ページと同じく、データの更新（/api/refresh）で作り直す
  { revalidate: CACHE_REVALIDATE_SECONDS, tags: ["top-page-data", "organizations"] },
);
