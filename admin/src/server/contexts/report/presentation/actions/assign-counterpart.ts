"use server";

import "server-only";

import { revalidatePath } from "next/cache";
import { prisma } from "@/server/contexts/shared/infrastructure/prisma";
import {
  AssignCounterpartUsecase,
  UnassignCounterpartUsecase,
} from "@/server/contexts/report/application/usecases/assign-counterpart-usecase";
import { PrismaCounterpartAssignmentTransactionRepository } from "@/server/contexts/report/infrastructure/repositories/prisma-counterpart-assignment-transaction.repository";
import { PrismaCounterpartRepository } from "@/server/contexts/report/infrastructure/repositories/prisma-counterpart.repository";
import { PrismaTransactionCounterpartRepository } from "@/server/contexts/report/infrastructure/repositories/prisma-transaction-counterpart.repository";

export interface AssignCounterpartActionResult {
  success: boolean;
  errors?: string[];
}

export async function assignCounterpartAction(
  transactionId: string,
  counterpartId: string,
): Promise<AssignCounterpartActionResult> {
  try {
    const transactionRepository = new PrismaCounterpartAssignmentTransactionRepository(prisma);
    const counterpartRepository = new PrismaCounterpartRepository(prisma);
    const transactionCounterpartRepository = new PrismaTransactionCounterpartRepository(prisma);
    const usecase = new AssignCounterpartUsecase(
      transactionRepository,
      counterpartRepository,
      transactionCounterpartRepository,
    );
    const result = await usecase.execute({ transactionId, counterpartId });

    if (!result.success) {
      return { success: false, errors: result.errors };
    }

    revalidatePath("/assign/counterparts");
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
    const transactionCounterpartRepository = new PrismaTransactionCounterpartRepository(prisma);
    const usecase = new UnassignCounterpartUsecase(transactionCounterpartRepository);
    const result = await usecase.execute({ transactionId });

    if (!result.success) {
      return { success: false, errors: result.errors };
    }

    revalidatePath("/assign/counterparts");
    return { success: true };
  } catch (error) {
    console.error("Error unassigning counterpart:", error);
    return {
      success: false,
      errors: [error instanceof Error ? error.message : "取引先の紐付け解除に失敗しました"],
    };
  }
}
