import "server-only";
import {
  PromptHistory,
  validatePromptOwnerId,
  type PromptOverview,
} from "@/server/contexts/research-fund/domain/models/prompt";
import type { PromptRepository } from "@/server/contexts/research-fund/domain/repositories/prompt-repository.interface";
import {
  DEFAULT_ADDRESS_SEARCH_PROMPT,
  buildAutomaticAddressSearchPrompt,
} from "@/server/contexts/research-fund/domain/services/payee-address-search-prompt";

/** 議員の住所検索プロンプトの版履歴と、エディタに出す本文を返す */
export class GetAddressSearchPromptOverviewUsecase {
  constructor(private repository: PromptRepository) {}

  async execute(politicianId: string): Promise<PromptOverview> {
    validatePromptOwnerId(politicianId);
    const history = PromptHistory.fromRecords(await this.repository.list(politicianId));
    return {
      ...history.overview(DEFAULT_ADDRESS_SEARCH_PROMPT),
      automaticPrompt: buildAutomaticAddressSearchPrompt(),
    };
  }
}
