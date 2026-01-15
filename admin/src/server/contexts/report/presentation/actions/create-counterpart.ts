"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/server/contexts/shared/infrastructure/prisma";
import { PrismaCounterpartRepository } from "@/server/contexts/report/infrastructure/repositories/prisma-counterpart.repository";
import { CreateCounterpartUsecase } from "@/server/contexts/report/application/usecases/manage-counterpart-usecase";

/**
 * クライアントから受け取る入力
 * tenantId は JSON シリアライズのため string で受け取る
 */
export interface CreateCounterpartActionInput {
  tenantId: string;
  name: string;
  postalCode: string | null;
  address: string | null;
}

export interface CreateCounterpartActionResult {
  success: boolean;
  counterpartId?: string;
  errors?: string[];
}

export async function createCounterpartAction(
  input: CreateCounterpartActionInput,
): Promise<CreateCounterpartActionResult> {
  try {
    const repository = new PrismaCounterpartRepository(prisma);
    const usecase = new CreateCounterpartUsecase(repository);

    // クライアントから受け取った string を bigint に変換
    const result = await usecase.execute({
      tenantId: BigInt(input.tenantId),
      name: input.name,
      postalCode: input.postalCode,
      address: input.address,
    });

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
