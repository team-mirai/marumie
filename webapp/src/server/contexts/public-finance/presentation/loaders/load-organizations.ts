import "server-only";

import { unstable_cache } from "next/cache";
import { prisma } from "@/server/contexts/public-finance/infrastructure/prisma";
import { PrismaPoliticalOrganizationRepository } from "@/server/contexts/public-finance/infrastructure/repositories/prisma-political-organization.repository";
import { GetOrganizationsUsecase } from "@/server/contexts/public-finance/application/usecases/get-organizations-usecase";
import { CACHE_REVALIDATE_SECONDS } from "./constants";

export const loadOrganizations = unstable_cache(
  async () => {
    const politicalOrganizationRepository = new PrismaPoliticalOrganizationRepository(prisma);
    const usecase = new GetOrganizationsUsecase(politicalOrganizationRepository);
    return await usecase.execute();
  },
  ["organizations"],
  {
    revalidate: CACHE_REVALIDATE_SECONDS,
  },
);
