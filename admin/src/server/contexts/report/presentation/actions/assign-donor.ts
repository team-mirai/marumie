"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/server/contexts/shared/infrastructure/prisma";
import { PrismaDonorRepository } from "@/server/contexts/report/infrastructure/repositories/prisma-donor.repository";
import { PrismaTransactionDonorRepository } from "@/server/contexts/report/infrastructure/repositories/prisma-transaction-donor.repository";
import { PrismaTransactionWithDonorRepository } from "@/server/contexts/report/infrastructure/repositories/prisma-transaction-with-donor.repository";
import { AssignDonorUsecase } from "@/server/contexts/report/application/usecases/assign-donor-usecase";

export interface AssignDonorActionResult {
  success: boolean;
  errors?: string[];
}

export async function assignDonorAction(
  transactionId: string,
  donorId: string,
): Promise<AssignDonorActionResult> {
  try {
    const transactionRepository = new PrismaTransactionWithDonorRepository(prisma);
    const donorRepository = new PrismaDonorRepository(prisma);
    const transactionDonorRepository = new PrismaTransactionDonorRepository(prisma);
    const usecase = new AssignDonorUsecase(
      transactionRepository,
      donorRepository,
      transactionDonorRepository,
    );
    const result = await usecase.execute({ transactionId, donorId });

    if (!result.success) {
      return { success: false, errors: result.errors };
    }

    revalidatePath("/assign/donor");
    return { success: true };
  } catch (error) {
    console.error("Error assigning donor:", error);
    return {
      success: false,
      errors: [error instanceof Error ? error.message : "寄付者の紐付けに失敗しました"],
    };
  }
}
