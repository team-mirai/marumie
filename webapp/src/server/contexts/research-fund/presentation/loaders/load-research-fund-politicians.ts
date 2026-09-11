import "server-only";

import { unstable_cache } from "next/cache";
import {
  GetResearchFundPoliticiansUsecase,
  type GetResearchFundPoliticiansParams,
} from "@/server/contexts/research-fund/application/usecases/get-research-fund-politicians-usecase";
import { PrismaResearchFundRepository } from "@/server/contexts/research-fund/infrastructure/repositories/prisma-research-fund.repository";
import {
  CACHE_REVALIDATE_SECONDS,
  RESEARCH_FUND_CACHE_TAG,
} from "@/server/contexts/research-fund/presentation/loaders/constants";
import { prisma } from "@/server/contexts/shared/infrastructure/prisma";

export const loadResearchFundPoliticians = unstable_cache(
  async (params: GetResearchFundPoliticiansParams) => {
    const usecase = new GetResearchFundPoliticiansUsecase(new PrismaResearchFundRepository(prisma));
    return await usecase.execute(params);
  },
  [`${RESEARCH_FUND_CACHE_TAG}-politicians`],
  { revalidate: CACHE_REVALIDATE_SECONDS, tags: [RESEARCH_FUND_CACHE_TAG] },
);
