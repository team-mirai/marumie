"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/server/contexts/shared/infrastructure/prisma";
import { PrismaDonorRepository } from "@/server/contexts/report/infrastructure/repositories/prisma-donor.repository";
import { UpdateDonorUsecase } from "@/server/contexts/report/application/usecases/manage-donor-usecase";
import type { UpdateDonorInput } from "@/server/contexts/report/domain/models/donor";

export interface UpdateDonorActionResult {
  success: boolean;
  errors?: string[];
}

export async function updateDonorAction(
  id: string,
  input: UpdateDonorInput,
): Promise<UpdateDonorActionResult> {
  try {
    const repository = new PrismaDonorRepository(prisma);
    const usecase = new UpdateDonorUsecase(repository);

    const result = await usecase.execute(id, input);

    if (!result.success) {
      return { success: false, errors: result.errors };
    }

    revalidatePath("/donors");
    revalidatePath("/assign/donors");
    return { success: true };
  } catch (error) {
    console.error("Error updating donor:", error);
    return {
      success: false,
      errors: [error instanceof Error ? error.message : "寄付者の更新に失敗しました"],
    };
  }
}
