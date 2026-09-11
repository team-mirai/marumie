import "server-only";
import {
  ExpenditureGroupError,
  expenditureGroupEditSchema,
  normalizeEntryIds,
  normalizeOutcomes,
  type ExpenditureGroupEdit,
  type ExpenditureGroupSummary,
  type ExpenditureGroupWrite,
} from "@/server/contexts/research-fund/domain/models/expenditure-group";
import type { ExpenditureGroupRepository } from "@/server/contexts/research-fund/domain/repositories/expenditure-group-repository.interface";
import { aggregateLinkedEntries } from "@/shared/research-fund/expenditure-group";

const MAX_POLICY_COMMENT_LENGTH = 2000;

function validateId(id: string) {
  if (!/^[1-9]\d*$/.test(id)) throw new ExpenditureGroupError("IDが不正です");
}

export class ManageExpenditureGroupsUsecase {
  constructor(private repository: ExpenditureGroupRepository) {}

  /** 一覧画面。金額・件数・期間は紐づけた仕訳から自動集計する */
  async list(bookId: string) {
    validateId(bookId);
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

  /** 新規／編集フォーム。groupId が null なら新規 */
  async form(bookId: string, groupId: string | null) {
    validateId(bookId);
    const entries = await this.repository.entries(bookId);
    if (groupId === null) return { group: null, entries };
    validateId(groupId);
    const group = await this.repository.find(bookId, groupId);
    if (!group) throw new ExpenditureGroupError("支出群が見つかりません");
    return { group, entries };
  }

  async savePolicyComment(bookId: string, policyComment: unknown) {
    validateId(bookId);
    if (typeof policyComment !== "string")
      throw new ExpenditureGroupError("活用方針の入力が不正です");
    const trimmed = policyComment.trim();
    if (trimmed.length > MAX_POLICY_COMMENT_LENGTH)
      throw new ExpenditureGroupError(
        `活用方針は${MAX_POLICY_COMMENT_LENGTH}文字以内で入力してください`,
      );
    await this.repository.savePolicyComment(bookId, trimmed);
  }

  /** 新規作成なら作った支出群の ID を、編集なら渡された ID を返す */
  async save(bookId: string, groupId: string | null, input: ExpenditureGroupEdit) {
    validateId(bookId);
    if (groupId !== null) validateId(groupId);
    const write = await this.prepare(bookId, groupId, input);
    if (groupId === null) return this.repository.create(bookId, write);
    await this.repository.update(bookId, groupId, write);
    return groupId;
  }

  private async prepare(
    bookId: string,
    groupId: string | null,
    input: ExpenditureGroupEdit,
  ): Promise<ExpenditureGroupWrite> {
    const parsed = expenditureGroupEditSchema.safeParse(input);
    if (!parsed.success) throw new ExpenditureGroupError("タイトルと説明を入力してください");
    const entryIds = normalizeEntryIds(parsed.data.entryIds);
    const entries = await this.repository.entries(bookId);
    const byId = new Map(entries.map((entry) => [entry.id, entry]));
    for (const entryId of entryIds) {
      const entry = byId.get(entryId);
      if (!entry) throw new ExpenditureGroupError("この帳簿にない仕訳は紐づけられません");
      // 1 仕訳は 1 つの支出群にしか属せない（公開側で金額が二重計上されるため）
      if (entry.groupId !== null && entry.groupId !== groupId)
        throw new ExpenditureGroupError("他の支出群に紐づいている仕訳は選べません");
    }
    return {
      title: parsed.data.title,
      description: parsed.data.description,
      outcomes: normalizeOutcomes(parsed.data.outcomes),
      entryIds,
    };
  }
}
