"use server";

import { prisma } from "@/server/contexts/shared/infrastructure/prisma";
import {
  SuggestCounterpartUsecase,
  type SuggestCounterpartResult,
} from "@/server/contexts/report/application/usecases/suggest-counterpart-usecase";
import { PrismaReportTransactionRepository } from "@/server/contexts/report/infrastructure/repositories/prisma-report-transaction.repository";
import { PrismaCounterpartRepository } from "@/server/contexts/report/infrastructure/repositories/prisma-counterpart.repository";

/**
 * tenantId は JSON シリアライズのため string で受け取る
 */
export async function suggestCounterpartAction(
  tenantId: string,
  transactionId: string,
  politicalOrganizationId: string,
  limit?: number,
): Promise<SuggestCounterpartResult> {
  try {
    const transactionRepository = new PrismaReportTransactionRepository(prisma);
    const counterpartRepository = new PrismaCounterpartRepository(prisma);
    const usecase = new SuggestCounterpartUsecase(transactionRepository, counterpartRepository);
    return await usecase.execute({
      tenantId: BigInt(tenantId),
      transactionId,
      politicalOrganizationId,
      limit,
    });
  } catch (error) {
    console.error("Error suggesting counterpart:", error);
    return {
      success: false,
      suggestions: [],
      errors: [error instanceof Error ? error.message : "提案の取得に失敗しました"],
    };
  }
}
