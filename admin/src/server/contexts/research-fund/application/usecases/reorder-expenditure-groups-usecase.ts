import "server-only";
import { invalidateWebappCache } from "@/server/contexts/research-fund/application/services/invalidate-webapp-cache";
import {
  assertValidIds,
  ExpenditureGroupError,
  validateGroupOrder,
} from "@/server/contexts/research-fund/domain/models/expenditure-group";
import type { ExpenditureGroupRepository } from "@/server/contexts/research-fund/domain/repositories/expenditure-group-repository.interface";
import type { ICacheInvalidator } from "@/server/contexts/shared/domain/services/cache-invalidator.interface";

/** 支出群を並べ替える */
export class ReorderExpenditureGroupsUsecase {
  constructor(
    private repository: ExpenditureGroupRepository,
    private cacheInvalidator: ICacheInvalidator,
  ) {}

  /** 一覧に出ている支出群を過不足なく、表示したい順に渡す */
  async execute(bookId: string, groupIds: readonly string[]) {
    assertValidIds(bookId, ...groupIds);
    const order = validateGroupOrder(groupIds);
    if (order.status === "invalid") throw new ExpenditureGroupError(order.errors[0].message);
    if (order.value.length === 0) return { cacheWarning: null };
    await this.repository.reorder(bookId, order.value);
    return { cacheWarning: await invalidateWebappCache(this.cacheInvalidator) };
  }
}
