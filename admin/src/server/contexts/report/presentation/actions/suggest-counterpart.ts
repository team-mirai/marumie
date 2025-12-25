"use server";

import { prisma } from "@/server/contexts/shared/infrastructure/prisma";
import {
  SuggestCounterpartUsecase,
  type SuggestCounterpartResult,
} from "@/server/contexts/report/application/usecases/suggest-counterpart-usecase";
import { PrismaCounterpartAssignmentTransactionRepository } from "@/server/contexts/report/infrastructure/repositories/prisma-counterpart-assignment-transaction.repository";
import { PrismaCounterpartRepository } from "@/server/contexts/report/infrastructure/repositories/prisma-counterpart.repository";

export async function suggestCounterpartAction(
  transactionId: string,
  politicalOrganizationId: string,
  limit?: number,
): Promise<SuggestCounterpartResult> {
  try {
    const transactionRepository = new PrismaCounterpartAssignmentTransactionRepository(prisma);
    const counterpartRepository = new PrismaCounterpartRepository(prisma);
    const usecase = new SuggestCounterpartUsecase(transactionRepository, counterpartRepository);
    return await usecase.execute({ transactionId, politicalOrganizationId, limit });
  } catch (error) {
    console.error("Error suggesting counterpart:", error);
    return {
      success: false,
      suggestions: [],
      errors: [error instanceof Error ? error.message : "提案の取得に失敗しました"],
    };
  }
}
