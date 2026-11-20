import "server-only";

import { unstable_cache } from "next/cache";
import { GetResearchFundComingSoonPageUsecase } from "@/server/contexts/research-fund/application/usecases/get-research-fund-coming-soon-page-usecase";
import type { ResearchFundComingSoonPage } from "@/server/contexts/research-fund/domain/models/research-fund-politician-list";
import { PrismaResearchFundRepository } from "@/server/contexts/research-fund/infrastructure/repositories/prisma-research-fund.repository";
import {
  CACHE_REVALIDATE_SECONDS,
  RESEARCH_FUND_CACHE_TAG,
} from "@/server/contexts/research-fund/presentation/loaders/constants";
import { prisma } from "@/server/contexts/shared/infrastructure/prisma";
import { parsePoliticianPathSegment } from "@/shared/research-fund/preview-path";

const loadCached = unstable_cache(
  async (slug: string) => {
    const usecase = new GetResearchFundComingSoonPageUsecase(
      new PrismaResearchFundRepository(prisma),
    );
    return await usecase.execute(slug);
  },
  [`${RESEARCH_FUND_CACHE_TAG}-coming-soon-page`],
  { revalidate: CACHE_REVALIDATE_SECONDS, tags: [RESEARCH_FUND_CACHE_TAG] },
);

/**
 * URL の slug の区間（/p/{ここ}/{年度}）から、「準備中」の議員のページのデータを引く。準備中でなければ null（404）。
 * プレビュー URL は本来のデータを見るためのものなので、準備中の表示にはしない（null）。
 * 取れなくても 404 にするだけにする
 */
export async function loadResearchFundComingSoonPageByPath(
  pathSlug: string,
): Promise<ResearchFundComingSoonPage | null> {
  const { slug, previewToken } = parsePoliticianPathSegment(pathSlug);
  if (previewToken !== null) return null;
  return await loadCached(slug).catch((error) => {
    console.error("loadResearchFundComingSoonPageByPath error:", error);
    return null;
  });
}
