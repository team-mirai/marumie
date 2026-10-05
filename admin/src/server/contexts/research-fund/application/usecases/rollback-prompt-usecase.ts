import "server-only";
import {
  validatePromptOwnerId,
  validatePromptVersion,
} from "@/server/contexts/research-fund/domain/models/prompt";
import type { PromptRepository } from "@/server/contexts/research-fund/domain/repositories/prompt-repository.interface";

/** 過去の版を有効版に戻す。新しい版は作らない */
export class RollbackPromptUsecase {
  constructor(private repository: PromptRepository) {}

  async execute(politicianId: string, version: unknown): Promise<void> {
    validatePromptOwnerId(politicianId);
    await this.repository.activate(politicianId, validatePromptVersion(version));
  }
}
