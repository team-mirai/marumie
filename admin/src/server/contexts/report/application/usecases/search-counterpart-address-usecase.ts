import "server-only";
import type { LLMGateway } from "@/server/contexts/report/infrastructure/llm/llm-gateway.interface";
import type { SearchResult } from "@/server/contexts/report/infrastructure/llm/types";

export class SearchCounterpartAddressUsecase {
  constructor(private readonly llmGateway: LLMGateway) {}

  async execute(companyName: string, hint?: string): Promise<SearchResult> {
    const result = await this.llmGateway.searchAddress({
      companyName,
      hint,
    });

    if (result.candidates.length === 0) {
      return {
        success: false,
        error: {
          type: "NO_RESULTS",
          message: "住所候補が見つかりませんでした。検索ヒントを追加して再検索してください。",
        },
      };
    }

    return {
      success: true,
      data: result,
    };
  }
}
