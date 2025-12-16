"use server";

import { prisma } from "@/server/contexts/shared/infrastructure/prisma";
import {
  SuggestCounterpartUsecase,
  type SuggestCounterpartResult,
} from "@/server/contexts/report/application/usecases/suggest-counterpart-usecase";

export async function suggestCounterpartAction(
  transactionId: string,
  politicalOrganizationId: string,
  limit?: number,
): Promise<SuggestCounterpartResult> {
  try {
    const usecase = new SuggestCounterpartUsecase(prisma);
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
