"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/server/contexts/shared/infrastructure/prisma";
import { BulkUnassignCounterpartUsecase } from "@/server/contexts/report/application/usecases/bulk-unassign-counterpart-usecase";

const usecase = new BulkUnassignCounterpartUsecase(prisma);

export interface BulkUnassignCounterpartInput {
  transactionIds: string[];
}

export interface BulkUnassignCounterpartResult {
  success: boolean;
  errors?: string[];
}

export async function bulkUnassignCounterpartAction(
  input: BulkUnassignCounterpartInput,
): Promise<BulkUnassignCounterpartResult> {
  try {
    const result = await usecase.execute(input);

    if (result.success) {
      revalidatePath("/counterparts/[id]", "page");
      revalidatePath("/assign/counterparts");
    }

    return result;
  } catch (error) {
    console.error("Failed to bulk unassign counterparts:", error);
    return {
      success: false,
      errors: [error instanceof Error ? error.message : "一括紐付け解除に失敗しました"],
    };
  }
}
