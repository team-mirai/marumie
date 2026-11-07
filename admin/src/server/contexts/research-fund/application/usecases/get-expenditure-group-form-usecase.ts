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
    if (groupId !== null) assertValidIds(groupId);
    // 紐づけるかを判断できるよう、候補の仕訳は中身（支払先・特記事項・書類など）付きで返す
    const entries = await this.repository.candidates(bookId);
    if (groupId === null) return { group: null, entries };
    const group = await this.repository.find(bookId, groupId);
    if (!group) throw new ExpenditureGroupError("支出群が見つかりません");
    return { group, entries };
  }
}
