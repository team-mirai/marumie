import "server-only";

import { unstable_cache } from "next/cache";
import { GetOrganizationProfileUsecase } from "@/server/contexts/public-finance/application/usecases/get-organization-profile-usecase";
import { prisma } from "@/server/contexts/public-finance/infrastructure/prisma";
import { PrismaPoliticalOrganizationRepository } from "@/server/contexts/public-finance/infrastructure/repositories/prisma-political-organization.repository";
import { CACHE_REVALIDATE_SECONDS } from "./constants";

export const loadOrganizationProfile = unstable_cache(
  async (slug: string) => {
    const usecase = new GetOrganizationProfileUsecase(
      new PrismaPoliticalOrganizationRepository(prisma),
    );
    return await usecase.execute(slug);
  },
  ["organization-profile"],
  {
    revalidate: CACHE_REVALIDATE_SECONDS,
    tags: ["organizations"],
  },
);
