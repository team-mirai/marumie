"use server";
import { revalidatePath } from "next/cache";
import type { PoliticianInput } from "@/shared/models/politician";
import { requireAuth } from "@/server/contexts/auth/presentation/loaders/require-auth";
import { ManagePoliticianUsecase } from "@/server/contexts/shared/application/usecases/manage-politician-usecase";
import { PrismaPoliticianRepository } from "@/server/contexts/shared/infrastructure/repositories/prisma-politician.repository";
import { prisma } from "@/server/contexts/shared/infrastructure/prisma";

export async function savePolitician(id: string | null, input: PoliticianInput) {
  await requireAuth();
  try {
    await new ManagePoliticianUsecase(new PrismaPoliticianRepository(prisma)).save(id, input);
    revalidatePath("/politicians", "layout");
    return { success: true as const };
  } catch (error) {
    return {
      success: false as const,
      error: error instanceof Error ? error.message : "保存に失敗しました",
    };
  }
}
export async function deletePolitician(id: string) {
  await requireAuth();
  try {
    await new ManagePoliticianUsecase(new PrismaPoliticianRepository(prisma)).delete(id);
    revalidatePath("/politicians", "layout");
    return { success: true as const };
  } catch {
    return { success: false as const, error: "削除に失敗しました。もう一度お試しください" };
  }
}
