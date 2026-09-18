import "server-only";

import { unstable_cache } from "next/cache";
import { prisma } from "@/server/contexts/public-finance/infrastructure/prisma";
import { PrismaPoliticalOrganizationRepository } from "@/server/contexts/public-finance/infrastructure/repositories/prisma-political-organization.repository";
import { GetOrganizationBySlugUsecase } from "@/server/contexts/public-finance/application/usecases/get-organization-by-slug-usecase";
import { CACHE_REVALIDATE_SECONDS } from "@/server/contexts/public-finance/presentation/loaders/constants";

/**
 * slug で指定した政治団体を1件だけ取得する。
 * キャッシュキーには slug を含める（unstable_cache は引数もキーに含める）。
 */
export const loadOrganizationBySlug = unstable_cache(
  async (slug: string) => {
    const politicalOrganizationRepository = new PrismaPoliticalOrganizationRepository(prisma);
    const usecase = new GetOrganizationBySlugUsecase(politicalOrganizationRepository);
    return await usecase.execute(slug);
  },
  ["organization-by-slug"],
  {
    revalidate: CACHE_REVALIDATE_SECONDS,
    tags: ["organizations"],
  },
);
