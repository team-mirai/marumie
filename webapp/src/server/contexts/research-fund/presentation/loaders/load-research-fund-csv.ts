import "server-only";

import { unstable_cache } from "next/cache";
import {
  GetResearchFundCsvUsecase,
  type GetResearchFundCsvParams,
} from "@/server/contexts/research-fund/application/usecases/get-research-fund-csv-usecase";
import { PrismaResearchFundRepository } from "@/server/contexts/research-fund/infrastructure/repositories/prisma-research-fund.repository";
import {
  CACHE_REVALIDATE_SECONDS,
  RESEARCH_FUND_CACHE_TAG,
  RESEARCH_FUND_CSV_CACHE_KEY,
} from "@/server/contexts/research-fund/presentation/loaders/constants";
import { prisma } from "@/server/contexts/shared/infrastructure/prisma";

/** 公開ページと同じタグでキャッシュし、admin が公開したら CSV も一緒に無効化されるようにする。 */
export const loadResearchFundCsv = unstable_cache(
  async (params: GetResearchFundCsvParams) => {
    const usecase = new GetResearchFundCsvUsecase(new PrismaResearchFundRepository(prisma));
    return await usecase.execute(params);
  },
  [RESEARCH_FUND_CSV_CACHE_KEY],
  { revalidate: CACHE_REVALIDATE_SECONDS, tags: [RESEARCH_FUND_CACHE_TAG] },
);
