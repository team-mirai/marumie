import "server-only";
import {
  PromptHistory,
  validatePromptOwnerId,
  type PromptOverview,
} from "@/server/contexts/research-fund/domain/models/prompt";
import type { PromptRepository } from "@/server/contexts/research-fund/domain/repositories/prompt-repository.interface";
import {
  DEFAULT_OFFICE_PROMPT,
  buildAutomaticReceiptPrompt,
} from "@/server/contexts/research-fund/domain/services/receipt-extraction-prompt";

/** 議員の読み取りプロンプトの版履歴と、エディタに出す本文を返す */
export class GetPromptOverviewUsecase {
  constructor(private repository: PromptRepository) {}

  async execute(politicianId: string): Promise<PromptOverview> {
    validatePromptOwnerId(politicianId);
    const history = PromptHistory.fromRecords(await this.repository.list(politicianId));
    return {
      ...history.overview(DEFAULT_OFFICE_PROMPT),
      automaticPrompt: buildAutomaticReceiptPrompt(),
    };
  }
}
