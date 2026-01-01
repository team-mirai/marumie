"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/server/contexts/shared/infrastructure/prisma";
import { PrismaCounterpartRepository } from "@/server/contexts/report/infrastructure/repositories/prisma-counterpart.repository";
import { CreateCounterpartUsecase } from "@/server/contexts/report/application/usecases/manage-counterpart-usecase";
import type { CreateCounterpartInput } from "@/server/contexts/report/domain/models/counterpart";

export interface CreateCounterpartActionResult {
  success: boolean;
  counterpartId?: string;
  errors?: string[];
}

export async function createCounterpartAction(
  input: CreateCounterpartInput,
): Promise<CreateCounterpartActionResult> {
  try {
    const repository = new PrismaCounterpartRepository(prisma);
    const usecase = new CreateCounterpartUsecase(repository);

    const result = await usecase.execute(input);

    if (!result.success) {
      return { success: false, errors: result.errors };
    }

    revalidatePath("/counterparts");
    return { success: true, counterpartId: result.counterpart?.id };
  } catch (error) {
    console.error("Error creating counterpart:", error);
    return {
      success: false,
      errors: [error instanceof Error ? error.message : "取引先の作成に失敗しました"],
    };
  }
}
