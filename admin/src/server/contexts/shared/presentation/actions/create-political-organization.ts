"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/server/contexts/shared/infrastructure/prisma";
import { PrismaPoliticalOrganizationRepository } from "@/server/contexts/shared/infrastructure/repositories/prisma-political-organization.repository";
import { CreatePoliticalOrganizationUsecase } from "@/server/contexts/shared/application/usecases/create-political-organization-usecase";

const repository = new PrismaPoliticalOrganizationRepository(prisma);
const usecase = new CreatePoliticalOrganizationUsecase(repository);

export interface CreatePoliticalOrganizationData {
  displayName: string;
  orgName?: string;
  slug: string;
  description?: string;
}

export async function createPoliticalOrganization(
  data: CreatePoliticalOrganizationData,
) {
  try {
    const { displayName, orgName, slug, description } = data;

    await usecase.execute(displayName, slug, orgName, description);

    revalidatePath("/political-organizations");
    return { success: true };
  } catch (error) {
    console.error("Error creating political organization:", error);

    if (error instanceof Error && error.message.includes("Unique constraint")) {
      throw new Error("このスラッグは既に使用されています");
    }

    throw new Error(
      error instanceof Error ? error.message : "政治団体の作成に失敗しました",
    );
  }
}
