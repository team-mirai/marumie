import "server-only";

import { unstable_cache } from "next/cache";
import { GetResearchFundComingSoonPoliticiansUsecase } from "@/server/contexts/research-fund/application/usecases/get-research-fund-coming-soon-politicians-usecase";
import type { ResearchFundComingSoonPolitician } from "@/server/contexts/research-fund/domain/models/research-fund-politician-list";
import { PrismaResearchFundRepository } from "@/server/contexts/research-fund/infrastructure/repositories/prisma-research-fund.repository";
import {
  CACHE_REVALIDATE_SECONDS,
  RESEARCH_FUND_CACHE_TAG,
} from "@/server/contexts/research-fund/presentation/loaders/constants";
import { prisma } from "@/server/contexts/shared/infrastructure/prisma";

const loadCached = unstable_cache(
  async () => {
    const usecase = new GetResearchFundComingSoonPoliticiansUsecase(
      new PrismaResearchFundRepository(prisma),
    );
    return await usecase.execute();
  },
  [`${RESEARCH_FUND_CACHE_TAG}-coming-soon`],
  { revalidate: CACHE_REVALIDATE_SECONDS, tags: [RESEARCH_FUND_CACHE_TAG] },
);

/**
 * 「準備中」としてグレーで出す議員。一覧の飾りなので、取れなくても（DB に届かないビルド時など）空にして画面は描く。
 */
export async function loadResearchFundComingSoonPoliticians(): Promise<
  ResearchFundComingSoonPolitician[]
> {
  return await loadCached().catch((error) => {
    console.error("loadResearchFundComingSoonPoliticians error:", error);
    return [];
  });
}
