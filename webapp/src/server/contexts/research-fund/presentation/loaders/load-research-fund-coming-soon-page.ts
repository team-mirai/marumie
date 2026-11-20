import "server-only";

import { unstable_cache } from "next/cache";
import { GetResearchFundComingSoonPageUsecase } from "@/server/contexts/research-fund/application/usecases/get-research-fund-coming-soon-page-usecase";
import { PrismaResearchFundRepository } from "@/server/contexts/research-fund/infrastructure/repositories/prisma-research-fund.repository";
import {
  CACHE_REVALIDATE_SECONDS,
  RESEARCH_FUND_CACHE_TAG,
} from "@/server/contexts/research-fund/presentation/loaders/constants";
import { prisma } from "@/server/contexts/shared/infrastructure/prisma";

/** 「準備中」の議員のページ（/p/{slug}/{年度}）のデータ。準備中でなければ null */
export const loadResearchFundComingSoonPage = unstable_cache(
  async (slug: string) => {
    const usecase = new GetResearchFundComingSoonPageUsecase(
      new PrismaResearchFundRepository(prisma),
    );
    return await usecase.execute(slug);
  },
  [`${RESEARCH_FUND_CACHE_TAG}-coming-soon-page`],
  { revalidate: CACHE_REVALIDATE_SECONDS, tags: [RESEARCH_FUND_CACHE_TAG] },
);
