"use server";

import "server-only";

import { revalidatePath } from "next/cache";
import { prisma } from "@/server/contexts/shared/infrastructure/prisma";
import { PrismaCounterpartRepository } from "@/server/contexts/report/infrastructure/repositories/prisma-counterpart.repository";
import { DeleteCounterpartUsecase } from "@/server/contexts/report/application/usecases/manage-counterpart-usecase";

export interface DeleteCounterpartActionResult {
  success: boolean;
  errors?: string[];
}

export async function deleteCounterpartAction(id: string): Promise<DeleteCounterpartActionResult> {
  try {
    const repository = new PrismaCounterpartRepository(prisma);
    const usecase = new DeleteCounterpartUsecase(repository);

    const result = await usecase.execute(id);

    if (!result.success) {
      return { success: false, errors: result.errors };
    }

    revalidatePath("/counterparts/master");
    return { success: true };
  } catch (error) {
    console.error("Error deleting counterpart:", error);
    return {
      success: false,
      errors: [error instanceof Error ? error.message : "取引先の削除に失敗しました"],
    };
  }
}
