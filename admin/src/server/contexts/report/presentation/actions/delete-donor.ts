"use server";

import "server-only";

import { revalidatePath } from "next/cache";
import { prisma } from "@/server/contexts/shared/infrastructure/prisma";
import { PrismaDonorRepository } from "@/server/contexts/report/infrastructure/repositories/prisma-donor.repository";
import { DeleteDonorUsecase } from "@/server/contexts/report/application/usecases/manage-donor-usecase";

export interface DeleteDonorActionResult {
  success: boolean;
  errors?: string[];
}

export async function deleteDonorAction(id: string): Promise<DeleteDonorActionResult> {
  try {
    const repository = new PrismaDonorRepository(prisma);
    const usecase = new DeleteDonorUsecase(repository, false);

    const result = await usecase.execute(id);

    if (!result.success) {
      return { success: false, errors: result.errors };
    }

    revalidatePath("/donors");
    revalidatePath("/assign/donors");
    return { success: true };
  } catch (error) {
    console.error("Error deleting donor:", error);
    return {
      success: false,
      errors: [error instanceof Error ? error.message : "寄付者の削除に失敗しました"],
    };
  }
}
