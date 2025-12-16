"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/server/contexts/shared/infrastructure/prisma";
import {
  AssignCounterpartUsecase,
  UnassignCounterpartUsecase,
} from "@/server/contexts/report/application/usecases/assign-counterpart-usecase";

export interface AssignCounterpartActionResult {
  success: boolean;
  errors?: string[];
}

export async function assignCounterpartAction(
  transactionId: string,
  counterpartId: string,
): Promise<AssignCounterpartActionResult> {
  try {
    const usecase = new AssignCounterpartUsecase(prisma);
    const result = await usecase.execute({ transactionId, counterpartId });

    if (!result.success) {
      return { success: false, errors: result.errors };
    }

    revalidatePath("/counterparts/assignment");
    return { success: true };
  } catch (error) {
    console.error("Error assigning counterpart:", error);
    return {
      success: false,
      errors: [error instanceof Error ? error.message : "取引先の紐付けに失敗しました"],
    };
  }
}

export async function unassignCounterpartAction(
  transactionId: string,
): Promise<AssignCounterpartActionResult> {
  try {
    const usecase = new UnassignCounterpartUsecase(prisma);
    const result = await usecase.execute({ transactionId });

    if (!result.success) {
      return { success: false, errors: result.errors };
    }

    revalidatePath("/counterparts/assignment");
    return { success: true };
  } catch (error) {
    console.error("Error unassigning counterpart:", error);
    return {
      success: false,
      errors: [error instanceof Error ? error.message : "取引先の紐付け解除に失敗しました"],
    };
  }
}
