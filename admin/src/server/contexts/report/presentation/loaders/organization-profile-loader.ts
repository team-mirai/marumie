import "server-only";

import { unstable_cache } from "next/cache";
import { prisma } from "@/server/contexts/shared/infrastructure/prisma";
import { PrismaOrganizationReportProfileRepository } from "@/server/contexts/report/infrastructure/repositories/prisma-organization-report-profile.repository";
import { GetOrganizationProfileUsecase } from "@/server/contexts/report/application/usecases/get-organization-profile-usecase";
import type { OrganizationReportProfile } from "@/server/contexts/report/domain/models/organization-report-profile";

const CACHE_REVALIDATE_SECONDS = 60;

export const loadOrganizationProfileData = unstable_cache(
  async (
    politicalOrganizationId: string,
    financialYear: number,
  ): Promise<OrganizationReportProfile | null> => {
    const repository = new PrismaOrganizationReportProfileRepository(prisma);
    const usecase = new GetOrganizationProfileUsecase(repository);

    return usecase.execute({
      politicalOrganizationId,
      financialYear,
    });
  },
  ["organization-profile-data"],
  { revalidate: CACHE_REVALIDATE_SECONDS },
);
