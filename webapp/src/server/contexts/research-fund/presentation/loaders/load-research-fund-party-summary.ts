import "server-only";

import { unstable_cache } from "next/cache";
import {
  GetResearchFundPartySummaryUsecase,
  type GetResearchFundPartySummaryParams,
} from "@/server/contexts/research-fund/application/usecases/get-research-fund-party-summary-usecase";
import { PrismaResearchFundRepository } from "@/server/contexts/research-fund/infrastructure/repositories/prisma-research-fund.repository";
import {
  CACHE_REVALIDATE_SECONDS,
  RESEARCH_FUND_CACHE_TAG,
} from "@/server/contexts/research-fund/presentation/loaders/constants";
import { prisma } from "@/server/contexts/shared/infrastructure/prisma";

export const loadResearchFundPartySummary = unstable_cache(
  async (params: GetResearchFundPartySummaryParams) => {
    const usecase = new GetResearchFundPartySummaryUsecase(
      new PrismaResearchFundRepository(prisma),
    );
    return await usecase.execute(params);
  },
  [`${RESEARCH_FUND_CACHE_TAG}-party`],
  { revalidate: CACHE_REVALIDATE_SECONDS, tags: [RESEARCH_FUND_CACHE_TAG] },
);
