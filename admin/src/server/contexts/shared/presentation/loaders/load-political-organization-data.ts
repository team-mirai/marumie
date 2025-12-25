import "server-only";

import { unstable_cache } from "next/cache";
import { prisma } from "@/server/contexts/shared/infrastructure/prisma";
import { PrismaPoliticalOrganizationRepository } from "@/server/contexts/shared/infrastructure/repositories/prisma-political-organization.repository";
import { GetPoliticalOrganizationUsecase } from "@/server/contexts/shared/application/usecases/get-political-organization-usecase";
import type { PoliticalOrganization } from "@/shared/models/political-organization";

const CACHE_REVALIDATE_SECONDS = 60;

export const loadPoliticalOrganizationData = unstable_cache(
  async (id: string): Promise<PoliticalOrganization> => {
    try {
      const organizationId = parseInt(id, 10);

      if (Number.isNaN(organizationId)) {
        throw new Error("Invalid organization ID");
      }

      const repository = new PrismaPoliticalOrganizationRepository(prisma);
      const usecase = new GetPoliticalOrganizationUsecase(repository);
      return await usecase.execute(BigInt(organizationId));
    } catch (error) {
      console.error("Error fetching political organization:", error);
      throw new Error(error instanceof Error ? error.message : "政治団体の取得に失敗しました");
    }
  },
  ["political-organization-data"],
  { revalidate: CACHE_REVALIDATE_SECONDS },
);
