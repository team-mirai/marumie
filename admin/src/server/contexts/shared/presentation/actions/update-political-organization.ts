"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/server/contexts/shared/infrastructure/prisma";
import { PrismaPoliticalOrganizationRepository } from "@/server/contexts/shared/infrastructure/repositories/prisma-political-organization.repository";
import { UpdatePoliticalOrganizationUsecase } from "@/server/contexts/shared/application/usecases/update-political-organization-usecase";

export interface UpdatePoliticalOrganizationData {
  displayName: string;
  orgName?: string;
  slug: string;
  description?: string;
}

export async function updatePoliticalOrganization(
  id: string,
  data: UpdatePoliticalOrganizationData,
) {
  try {
    const organizationId = parseInt(id, 10);

    if (Number.isNaN(organizationId)) {
      throw new Error("Invalid organization ID");
    }

    const repository = new PrismaPoliticalOrganizationRepository(prisma);
    const usecase = new UpdatePoliticalOrganizationUsecase(repository);
    await usecase.execute(BigInt(organizationId), data);

    revalidatePath("/political-organizations");
    return { success: true };
  } catch (error) {
    console.error("Error updating political organization:", error);

    if (error instanceof Error && error.message.includes("Record to update not found")) {
      throw new Error("政治団体が見つかりません");
    }

    if (error instanceof Error && error.message.includes("Unique constraint")) {
      throw new Error("このスラッグは既に使用されています");
    }

    throw new Error(error instanceof Error ? error.message : "政治団体の更新に失敗しました");
  }
}
