"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/server/contexts/shared/infrastructure/prisma";
import { PrismaDonorRepository } from "@/server/contexts/report/infrastructure/repositories/prisma-donor.repository";
import { CreateDonorUsecase } from "@/server/contexts/report/application/usecases/manage-donor-usecase";
import type { DonorType } from "@/server/contexts/report/domain/models/donor";

/**
 * クライアントから受け取る入力
 * tenantId は JSON シリアライズのため string で受け取る
 */
export interface CreateDonorActionInput {
  tenantId: string;
  donorType: DonorType;
  name: string;
  address: string | null;
  occupation: string | null;
}

export interface CreateDonorActionResult {
  success: boolean;
  donorId?: string;
  errors?: string[];
}

export async function createDonorAction(
  input: CreateDonorActionInput,
): Promise<CreateDonorActionResult> {
  try {
    const repository = new PrismaDonorRepository(prisma);
    const usecase = new CreateDonorUsecase(repository);

    // クライアントから受け取った string を bigint に変換
    const result = await usecase.execute({
      tenantId: BigInt(input.tenantId),
      donorType: input.donorType,
      name: input.name,
      address: input.address,
      occupation: input.occupation,
    });

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
