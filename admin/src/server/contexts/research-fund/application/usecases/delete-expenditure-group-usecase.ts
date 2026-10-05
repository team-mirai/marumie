import "server-only";
import { invalidateWebappCache } from "@/server/contexts/research-fund/application/services/invalidate-webapp-cache";
import { assertValidIds } from "@/server/contexts/research-fund/domain/models/expenditure-group";
import type { ExpenditureGroupRepository } from "@/server/contexts/research-fund/domain/repositories/expenditure-group-repository.interface";
import type { ICacheInvalidator } from "@/server/contexts/shared/domain/services/cache-invalidator.interface";

/** 支出群を削除する */
export class DeleteExpenditureGroupUsecase {
  constructor(
    private repository: ExpenditureGroupRepository,
    private cacheInvalidator: ICacheInvalidator,
  ) {}

  async execute(bookId: string, groupId: string) {
    assertValidIds(bookId, groupId);
    await this.repository.remove(bookId, groupId);
    return { cacheWarning: await invalidateWebappCache(this.cacheInvalidator) };
  }
}
