import "server-only";

import type {
  SearchResult,
  SearchError,
} from "@/server/contexts/report/domain/models/address-search";
import type { ILLMGateway } from "@/server/contexts/report/infrastructure/llm/llm-gateway.interface";

export interface SearchCounterpartAddressInput {
  name: string;
  hint?: string;
}

export class SearchCounterpartAddressUsecase {
  constructor(private llmGateway: ILLMGateway) {}

  async execute(input: SearchCounterpartAddressInput): Promise<SearchResult> {
    try {
      const result = await this.llmGateway.searchCounterpartAddress({
        name: input.name,
        hint: input.hint,
      });

      if (result.candidates.length === 0) {
        const error: SearchError = {
          type: "NO_RESULTS",
          message: `「${input.name}」の住所候補が見つかりませんでした`,
        };
        return { success: false, error };
      }

      return { success: true, data: result };
    } catch (error) {
      if (error instanceof Error) {
        if (error.message.includes("timeout") || error.message.includes("ETIMEDOUT")) {
          const timeoutError: SearchError = {
            type: "TIMEOUT",
            message: "検索がタイムアウトしました。しばらく待ってから再試行してください。",
          };
          return { success: false, error: timeoutError };
        }

        if (error.message.includes("rate") || error.message.includes("429")) {
          const rateLimitError: SearchError = {
            type: "RATE_LIMIT",
            retryAfter: 60,
          };
          return { success: false, error: rateLimitError };
        }

        const apiError: SearchError = {
          type: "API_ERROR",
          message: error.message,
          retryable: true,
        };
        return { success: false, error: apiError };
      }

      const unknownError: SearchError = {
        type: "API_ERROR",
        message: "予期しないエラーが発生しました",
        retryable: false,
      };
      return { success: false, error: unknownError };
    }
  }
}
