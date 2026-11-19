import "server-only";

import { prisma } from "@/server/contexts/shared/infrastructure/prisma";
import { PrismaPoliticalOrganizationRepository } from "@/server/contexts/shared/infrastructure/repositories/prisma-political-organization.repository";
import { GetPoliticalOrganizationsUsecase } from "@/server/contexts/shared/application/usecases/get-political-organizations-usecase";
import type { PoliticalOrganization } from "@/shared/models/political-organization";

export async function loadPoliticalOrganizationsData(): Promise<PoliticalOrganization[]> {
  try {
    const repository = new PrismaPoliticalOrganizationRepository(prisma);
    const usecase = new GetPoliticalOrganizationsUsecase(repository);
    return await usecase.execute();
  } catch (error) {
    console.error("Error fetching political organizations:", error);
    throw new Error("政治団体の取得に失敗しました");
  }
}
