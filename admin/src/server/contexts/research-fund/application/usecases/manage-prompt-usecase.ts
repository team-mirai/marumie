import "server-only";
import {
  PromptError,
  normalizePromptBody,
  summarizePromptChange,
  type PromptOverview,
} from "@/server/contexts/research-fund/domain/models/prompt";
import type { PromptRepository } from "@/server/contexts/research-fund/domain/repositories/prompt-repository.interface";
import {
  DEFAULT_OFFICE_PROMPT,
  buildAutomaticReceiptPrompt,
} from "@/server/contexts/research-fund/domain/services/receipt-extraction-prompt";

function validateId(id: string) {
  if (!/^[1-9]\d*$/.test(id)) throw new PromptError("IDが不正です");
}

export class ManagePromptUsecase {
  constructor(private repository: PromptRepository) {}

  async list(politicianId: string): Promise<PromptOverview> {
    validateId(politicianId);
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

  /** 新しい版として保存し、有効版にする。採番した版番号を返す */
  async save(politicianId: string, body: unknown, userId: string): Promise<number> {
    validateId(politicianId);
    return this.repository.create(politicianId, normalizePromptBody(body), userId);
  }

  /** 過去の版を有効版に戻す。新しい版は作らない */
  async rollback(politicianId: string, version: unknown): Promise<void> {
    validateId(politicianId);
    if (typeof version !== "number" || !Number.isInteger(version) || version < 1)
      throw new PromptError("版の指定が不正です");
    await this.repository.activate(politicianId, version);
  }
}
