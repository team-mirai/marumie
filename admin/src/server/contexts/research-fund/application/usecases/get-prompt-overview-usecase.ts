import "server-only";
import {
  summarizePromptChange,
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
    const records = await this.repository.list(politicianId);
    const versions = records.map((record, index) => ({
      ...record,
      // records は version の降順なので、次の要素が前の版にあたる
      summary: summarizePromptChange(record.body, records[index + 1]?.body ?? null),
    }));
    const active = versions.find((version) => version.isActive) ?? versions[0] ?? null;
    return {
      versions,
      body: active?.body ?? DEFAULT_OFFICE_PROMPT,
      activeVersion: active?.version ?? null,
      nextVersion: (versions[0]?.version ?? 0) + 1,
      automaticPrompt: buildAutomaticReceiptPrompt(),
    };
  }
}
