"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/server/contexts/shared/infrastructure/prisma";
import { PrismaDonorRepository } from "@/server/contexts/report/infrastructure/repositories/prisma-donor.repository";
import { PrismaTransactionDonorRepository } from "@/server/contexts/report/infrastructure/repositories/prisma-transaction-donor.repository";
import { PrismaTransactionWithDonorRepository } from "@/server/contexts/report/infrastructure/repositories/prisma-transaction-with-donor.repository";
import { BulkAssignDonorUsecase } from "@/server/contexts/report/application/usecases/assign-donor-usecase";

export interface BulkAssignDonorActionResult {
  success: boolean;
  assignedCount?: number;
  errors?: string[];
}

export async function bulkAssignDonorAction(
  transactionIds: string[],
  donorId: string,
): Promise<BulkAssignDonorActionResult> {
  try {
    const transactionRepository = new PrismaTransactionWithDonorRepository(prisma);
    const donorRepository = new PrismaDonorRepository(prisma);
    const transactionDonorRepository = new PrismaTransactionDonorRepository(prisma);
    const usecase = new BulkAssignDonorUsecase(
      transactionRepository,
      donorRepository,
      transactionDonorRepository,
    );
    const result = await usecase.execute({ transactionIds, donorId });

    if (!result.success) {
      return { success: false, errors: result.errors };
    }

    revalidatePath("/assign/donors");
    return { success: true, assignedCount: result.assignedCount };
  } catch (error) {
    console.error("Error bulk assigning donor:", error);
    return {
      success: false,
      errors: [error instanceof Error ? error.message : "寄付者の一括紐付けに失敗しました"],
    };
  }
}
