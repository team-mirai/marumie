"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/server/contexts/shared/infrastructure/prisma";

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

    if (!displayName.trim()) {
      throw new Error("表示名は必須です");
    }

    if (!slug.trim()) {
      throw new Error("スラッグは必須です");
    }

    await prisma.politicalOrganization.create({
      data: {
        displayName: displayName.trim(),
        orgName: orgName?.trim() || null,
        slug: slug.trim(),
        description: description?.trim() || null,
      },
    });

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
