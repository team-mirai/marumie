import "server-only";
import { invalidateWebappCache } from "@/server/contexts/research-fund/application/services/invalidate-webapp-cache";
import { Book } from "@/server/contexts/research-fund/domain/models/book";
import {
  assertValidIds,
  ExpenditureGroupError,
} from "@/server/contexts/research-fund/domain/models/expenditure-group";
import type { ExpenditureGroupRepository } from "@/server/contexts/research-fund/domain/repositories/expenditure-group-repository.interface";
import type { ICacheInvalidator } from "@/server/contexts/shared/domain/services/cache-invalidator.interface";

/** 帳簿の活用方針を保存する */
export class SaveUsagePolicyUsecase {
  constructor(
    private repository: ExpenditureGroupRepository,
    private cacheInvalidator: ICacheInvalidator,
  ) {}

  async execute(bookId: string, policyComment: unknown) {
    assertValidIds(bookId);
    const result = Book.normalizePolicyComment(policyComment);
    if (result.status === "invalid") throw new ExpenditureGroupError(result.errors[0].message);
    await this.repository.savePolicyComment(bookId, result.value);
    return { cacheWarning: await invalidateWebappCache(this.cacheInvalidator) };
  }
}
