"use server";

import "server-only";
import { revalidatePath } from "next/cache";
import { prisma } from "@/server/contexts/shared/infrastructure/prisma";
import { DeletePoliticalOrganizationUsecase } from "@/server/contexts/common/application/usecases/delete-political-organization-usecase";
import { PrismaPoliticalOrganizationRepository } from "@/server/contexts/common/infrastructure/repositories/prisma-political-organization.repository";

interface DeletePoliticalOrganizationResult {
  success: boolean;
  message: string;
}

export async function deletePoliticalOrganization(
  orgId: bigint,
): Promise<DeletePoliticalOrganizationResult> {
  const repository = new PrismaPoliticalOrganizationRepository(prisma);
  const usecase = new DeletePoliticalOrganizationUsecase(repository);

  const result = await usecase.execute(orgId);

  if (result.success) {
    revalidatePath("/political-organizations");
  }

  return result;
}
