import "server-only";
import {
  normalizePromptBody,
  validatePromptOwnerId,
} from "@/server/contexts/research-fund/domain/models/prompt";
import type { PromptRepository } from "@/server/contexts/research-fund/domain/repositories/prompt-repository.interface";

/** 新しい版として保存し、有効版にする。採番した版番号を返す */
export class SavePromptUsecase {
  constructor(private repository: PromptRepository) {}

  async execute(politicianId: string, body: unknown, userId: string): Promise<number> {
    validatePromptOwnerId(politicianId);
    return this.repository.create(politicianId, normalizePromptBody(body), userId);
  }
}
