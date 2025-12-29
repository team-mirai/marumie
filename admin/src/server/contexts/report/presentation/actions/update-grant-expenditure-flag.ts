"use server";

import "server-only";

import { revalidatePath } from "next/cache";
import { prisma } from "@/server/contexts/shared/infrastructure/prisma";
import { UpdateGrantExpenditureFlagUsecase } from "@/server/contexts/report/application/usecases/update-grant-expenditure-flag-usecase";
import { PrismaReportTransactionRepository } from "@/server/contexts/report/infrastructure/repositories/prisma-report-transaction.repository";

export interface UpdateGrantExpenditureFlagActionResult {
  success: boolean;
  errors?: string[];
}

export async function updateGrantExpenditureFlagAction(
  transactionId: string,
  isGrantExpenditure: boolean,
): Promise<UpdateGrantExpenditureFlagActionResult> {
  try {
    const transactionRepository = new PrismaReportTransactionRepository(prisma);
    const usecase = new UpdateGrantExpenditureFlagUsecase(transactionRepository);
    const result = await usecase.execute({ transactionId, isGrantExpenditure });

    if (!result.success) {
      return { success: false, errors: result.errors };
    }

    revalidatePath("/assign/counterparts");
    return { success: true };
  } catch (error) {
    console.error("Error updating grant expenditure flag:", error);
    return {
      success: false,
      errors: [error instanceof Error ? error.message : "交付金フラグの更新に失敗しました"],
    };
  }
}
