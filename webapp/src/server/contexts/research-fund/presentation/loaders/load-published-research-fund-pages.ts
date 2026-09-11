import "server-only";

import { unstable_cache } from "next/cache";
import { GetPublishedResearchFundPagesUsecase } from "@/server/contexts/research-fund/application/usecases/get-published-research-fund-pages-usecase";
import { PrismaResearchFundRepository } from "@/server/contexts/research-fund/infrastructure/repositories/prisma-research-fund.repository";
import {
  CACHE_REVALIDATE_SECONDS,
  RESEARCH_FUND_CACHE_TAG,
} from "@/server/contexts/research-fund/presentation/loaders/constants";
import { prisma } from "@/server/contexts/shared/infrastructure/prisma";

export const loadPublishedResearchFundPages = unstable_cache(
  async () => {
    const usecase = new GetPublishedResearchFundPagesUsecase(
      new PrismaResearchFundRepository(prisma),
    );
    return await usecase.execute();
  },
  [RESEARCH_FUND_CACHE_TAG, "published-pages"],
  { revalidate: CACHE_REVALIDATE_SECONDS, tags: [RESEARCH_FUND_CACHE_TAG] },
);
