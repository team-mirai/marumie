import "server-only";
import {
  assertValidIds,
  ExpenditureGroupError,
} from "@/server/contexts/research-fund/domain/models/expenditure-group";
import type { ExpenditureGroupRepository } from "@/server/contexts/research-fund/domain/repositories/expenditure-group-repository.interface";

/** 新規／編集フォーム。groupId が null なら新規 */
export class GetExpenditureGroupFormUsecase {
  constructor(private repository: ExpenditureGroupRepository) {}

  async execute(bookId: string, groupId: string | null) {
    assertValidIds(bookId);
    const entries = await this.repository.entries(bookId);
    if (groupId === null) return { group: null, entries };
    assertValidIds(groupId);
    const group = await this.repository.find(bookId, groupId);
    if (!group) throw new ExpenditureGroupError("支出群が見つかりません");
    return { group, entries };
  }
}
