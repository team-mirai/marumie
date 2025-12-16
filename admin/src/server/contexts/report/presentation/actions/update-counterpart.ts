"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/server/contexts/shared/infrastructure/prisma";
import { PrismaCounterpartRepository } from "@/server/contexts/report/infrastructure/repositories/prisma-counterpart.repository";
import { UpdateCounterpartUsecase } from "@/server/contexts/report/application/usecases/manage-counterpart-usecase";
import type { UpdateCounterpartInput } from "@/server/contexts/report/domain/models/counterpart";

export interface UpdateCounterpartActionResult {
  success: boolean;
  errors?: string[];
}

export async function updateCounterpartAction(
  id: string,
  input: UpdateCounterpartInput,
): Promise<UpdateCounterpartActionResult> {
  try {
    const repository = new PrismaCounterpartRepository(prisma);
    const usecase = new UpdateCounterpartUsecase(repository);

    const result = await usecase.execute(id, input);

    if (!result.success) {
      return { success: false, errors: result.errors };
    }

    revalidatePath("/counterparts/master");
    return { success: true };
  } catch (error) {
    console.error("Error updating counterpart:", error);
    return {
      success: false,
      errors: [error instanceof Error ? error.message : "取引先の更新に失敗しました"],
    };
  }
}
