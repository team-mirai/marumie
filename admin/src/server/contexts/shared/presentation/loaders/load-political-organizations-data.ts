import "server-only";

import { unstable_cache } from "next/cache";
import { prisma } from "@/server/contexts/shared/infrastructure/prisma";
import { PrismaPoliticalOrganizationRepository } from "@/server/contexts/shared/infrastructure/repositories/prisma-political-organization.repository";
import { GetPoliticalOrganizationsUsecase } from "@/server/contexts/shared/application/usecases/get-political-organizations-usecase";
import type { PoliticalOrganization } from "@/shared/models/political-organization";

const CACHE_REVALIDATE_SECONDS = 60;

const repository = new PrismaPoliticalOrganizationRepository(prisma);
const usecase = new GetPoliticalOrganizationsUsecase(repository);

export const loadPoliticalOrganizationsData = unstable_cache(
  async (): Promise<PoliticalOrganization[]> => {
    try {
      return await usecase.execute();
    } catch (error) {
      console.error("Error fetching political organizations:", error);
      throw new Error("政治団体の取得に失敗しました");
    }
  },
  ["political-organizations-data"],
  { revalidate: CACHE_REVALIDATE_SECONDS },
);
