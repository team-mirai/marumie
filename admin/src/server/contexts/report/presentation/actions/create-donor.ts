"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/server/contexts/shared/infrastructure/prisma";
import { PrismaDonorRepository } from "@/server/contexts/report/infrastructure/repositories/prisma-donor.repository";
import { CreateDonorUsecase } from "@/server/contexts/report/application/usecases/create-donor-usecase";
import type { CreateDonorInput } from "@/server/contexts/report/domain/models/donor";
import { requireAuth } from "@/server/contexts/auth/presentation/loaders/require-auth";

interface CreateDonorActionResult {
  success: boolean;
  donorId?: string;
  errors?: string[];
}

export async function createDonorAction(input: CreateDonorInput): Promise<CreateDonorActionResult> {
  await requireAuth();

  try {
    const repository = new PrismaDonorRepository(prisma);
    const usecase = new CreateDonorUsecase(repository);

    const result = await usecase.execute(input);

    if (!result.success) {
      return { success: false, errors: result.errors };
    }

    revalidatePath("/donors");
    revalidatePath("/assign/donors");
    return { success: true, donorId: result.donor?.id };
  } catch (error) {
    console.error("Error creating donor:", error);
    return {
      success: false,
      errors: [error instanceof Error ? error.message : "寄付者の作成に失敗しました"],
    };
  }
}
