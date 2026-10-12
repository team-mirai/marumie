import "server-only";
import { validatePromptOwnerId } from "@/server/contexts/research-fund/domain/models/prompt";
import type { PayeeAddressSearchResult } from "@/server/contexts/research-fund/domain/models/payee-address-search";
import type { PayeeAddressSearchGateway } from "@/server/contexts/research-fund/domain/repositories/payee-address-search-gateway.interface";
import type { PromptRepository } from "@/server/contexts/research-fund/domain/repositories/prompt-repository.interface";
import {
  DEFAULT_ADDRESS_SEARCH_PROMPT,
  buildPayeeAddressSearchPrompt,
} from "@/server/contexts/research-fund/domain/services/payee-address-search-prompt";

/** 議員の有効な住所検索プロンプト（版が無ければデフォルト）で、支払先の住所を検索する */
export class SearchPayeeAddressUsecase {
  constructor(
    private promptRepository: PromptRepository,
    private gateway: PayeeAddressSearchGateway,
  ) {}

  async execute(
    politicianId: string,
    name: string,
    hint?: string,
  ): Promise<PayeeAddressSearchResult> {
    validatePromptOwnerId(politicianId);
    const query = name.trim();
    if (query === "")
      return {
        success: false,
        error: {
          type: "NO_RESULTS",
          message: "検索する名称を入力してください。",
        },
      };
    const active = await this.promptRepository.findActive(politicianId);
    const prompt = buildPayeeAddressSearchPrompt(
      active?.body ?? DEFAULT_ADDRESS_SEARCH_PROMPT,
      query,
      hint?.trim() || undefined,
    );
    const data = await this.gateway.search(prompt, query);
    if (data.candidates.length === 0)
      return {
        success: false,
        error: {
          type: "NO_RESULTS",
          message: "住所候補が見つかりませんでした。検索ヒントを追加して再検索してください。",
        },
      };
    return { success: true, data };
  }
}
