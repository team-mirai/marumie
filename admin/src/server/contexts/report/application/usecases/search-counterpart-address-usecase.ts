import "server-only";

import type { SearchResult } from "@/server/contexts/report/domain/models/address-search";
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
        return {
          success: false,
          error: {
            type: "NO_RESULTS",
            message: `「${input.name}」の住所候補が見つかりませんでした`,
          },
        };
      }

      return { success: true, data: result };
    } catch (error) {
      const message = error instanceof Error ? error.message : "予期しないエラーが発生しました";
      return {
        success: false,
        error: {
          type: "SEARCH_FAILED",
          message: `検索に失敗しました: ${message}`,
        },
      };
    }
  }
}
