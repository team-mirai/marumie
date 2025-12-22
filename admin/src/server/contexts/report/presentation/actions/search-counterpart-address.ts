"use server";

import { SearchCounterpartAddressUsecase } from "@/server/contexts/report/application/usecases/search-counterpart-address-usecase";
import { VercelAIGateway } from "@/server/contexts/report/infrastructure/llm/vercel-ai-gateway";
import type { SearchResult } from "@/server/contexts/report/infrastructure/llm/types";

export async function searchCounterpartAddressAction(
  companyName: string,
  hint?: string,
): Promise<SearchResult> {
  try {
    const gateway = new VercelAIGateway();
    const usecase = new SearchCounterpartAddressUsecase(gateway);

    return await usecase.execute(companyName, hint);
  } catch (error) {
    console.error("Error searching counterpart address:", error);

    if (error instanceof Error) {
      if (error.message.includes("timeout") || error.message.includes("ETIMEDOUT")) {
        return {
          success: false,
          error: { type: "TIMEOUT", message: "検索がタイムアウトしました。再度お試しください。" },
        };
      }
      if (error.message.includes("rate") || error.message.includes("429")) {
        return {
          success: false,
          error: { type: "RATE_LIMIT", retryAfter: 60 },
        };
      }
    }

    return {
      success: false,
      error: {
        type: "API_ERROR",
        message: error instanceof Error ? error.message : "住所検索に失敗しました",
        retryable: true,
      },
    };
  }
}
