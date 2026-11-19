import "server-only";

import { unstable_cache } from "next/cache";
import {
  GetResearchFundPageUsecase,
  type GetResearchFundPageParams,
} from "@/server/contexts/research-fund/application/usecases/get-research-fund-page-usecase";
import { PrismaResearchFundRepository } from "@/server/contexts/research-fund/infrastructure/repositories/prisma-research-fund.repository";
import { prisma } from "@/server/contexts/shared/infrastructure/prisma";
import {
  CACHE_REVALIDATE_SECONDS,
  RESEARCH_FUND_CACHE_TAG,
} from "@/server/contexts/research-fund/presentation/loaders/constants";

export const loadResearchFundPage = unstable_cache(
  async (params: GetResearchFundPageParams) => {
    const usecase = new GetResearchFundPageUsecase(new PrismaResearchFundRepository(prisma));
    return await usecase.execute(params);
  },
  [RESEARCH_FUND_CACHE_TAG],
  { revalidate: CACHE_REVALIDATE_SECONDS, tags: [RESEARCH_FUND_CACHE_TAG] },
);
