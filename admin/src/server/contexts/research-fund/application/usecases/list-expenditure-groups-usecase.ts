import "server-only";
import {
  assertValidIds,
  ExpenditureGroupError,
  type ExpenditureGroupSummary,
} from "@/server/contexts/research-fund/domain/models/expenditure-group";
import type { ExpenditureGroupRepository } from "@/server/contexts/research-fund/domain/repositories/expenditure-group-repository.interface";
import { aggregateLinkedEntries } from "@/shared/research-fund/expenditure-group";

/** 一覧画面。金額・件数・期間は紐づけた仕訳から自動集計する */
export class ListExpenditureGroupsUsecase {
  constructor(private repository: ExpenditureGroupRepository) {}

  async execute(bookId: string) {
    assertValidIds(bookId);
    const book = await this.repository.book(bookId);
    if (!book) throw new ExpenditureGroupError("帳簿が見つかりません");
    const [records, entries] = await Promise.all([
      this.repository.list(bookId),
      this.repository.entries(bookId),
    ]);
    const byId = new Map(entries.map((entry) => [entry.id, entry]));
    const groups: ExpenditureGroupSummary[] = records.map((record) => ({
      ...record,
      ...aggregateLinkedEntries(
        record.entryIds.flatMap((entryId) => {
          const entry = byId.get(entryId);
          return entry ? [entry] : [];
        }),
      ),
    }));
    return { groups, policyComment: book.policyComment };
  }
}
