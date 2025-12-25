"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/server/contexts/shared/infrastructure/prisma";
import { BulkAssignCounterpartUsecase } from "@/server/contexts/report/application/usecases/bulk-assign-counterpart-usecase";
import { PrismaReportTransactionRepository } from "@/server/contexts/report/infrastructure/repositories/prisma-report-transaction.repository";
import { PrismaCounterpartRepository } from "@/server/contexts/report/infrastructure/repositories/prisma-counterpart.repository";
import { PrismaTransactionCounterpartRepository } from "@/server/contexts/report/infrastructure/repositories/prisma-transaction-counterpart.repository";

export interface BulkAssignCounterpartActionResult {
  success: boolean;
  successCount: number;
  failedIds: string[];
  errors?: string[];
}

export async function bulkAssignCounterpartAction(
  transactionIds: string[],
  counterpartId: string,
): Promise<BulkAssignCounterpartActionResult> {
  try {
    const transactionRepository = new PrismaReportTransactionRepository(prisma);
    const counterpartRepository = new PrismaCounterpartRepository(prisma);
    const transactionCounterpartRepository = new PrismaTransactionCounterpartRepository(prisma);
    const usecase = new BulkAssignCounterpartUsecase(
      transactionRepository,
      counterpartRepository,
      transactionCounterpartRepository,
    );
    const result = await usecase.execute({ transactionIds, counterpartId });

    if (!result.success) {
      return {
        success: false,
        successCount: result.successCount,
        failedIds: result.failedIds,
        errors: result.errors,
      };
    }

    revalidatePath("/assign/counterparts");
    return {
      success: true,
      successCount: result.successCount,
      failedIds: result.failedIds,
    };
  } catch (error) {
    console.error("Error bulk assigning counterpart:", error);
    return {
      success: false,
      successCount: 0,
      failedIds: [],
      errors: [error instanceof Error ? error.message : "一括紐付けに失敗しました"],
    };
  }
}
