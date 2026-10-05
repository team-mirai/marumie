import "server-only";
import { invalidateWebappCache } from "@/server/contexts/research-fund/application/services/invalidate-webapp-cache";
import {
  assertValidIds,
  ExpenditureGroupError,
  normalizeOutcomes,
  parseExpenditureGroupEdit,
  validateEntryLinks,
  type ExpenditureGroupEdit,
  type ExpenditureGroupWrite,
} from "@/server/contexts/research-fund/domain/models/expenditure-group";
import type { ExpenditureGroupRepository } from "@/server/contexts/research-fund/domain/repositories/expenditure-group-repository.interface";
import type { ICacheInvalidator } from "@/server/contexts/shared/domain/services/cache-invalidator.interface";

/** 支出群を新規作成（groupId が null）または編集する */
export class SaveExpenditureGroupUsecase {
  constructor(
    private repository: ExpenditureGroupRepository,
    private cacheInvalidator: ICacheInvalidator,
  ) {}

  /** 新規作成なら作った支出群の ID を、編集なら渡された ID を返す */
  async execute(bookId: string, groupId: string | null, input: ExpenditureGroupEdit) {
    assertValidIds(bookId);
    if (groupId !== null) assertValidIds(groupId);
    const write = await this.prepare(bookId, groupId, input);
    let id = groupId;
    if (id === null) id = await this.repository.create(bookId, write);
    else await this.repository.update(bookId, id, write);
    return { id, cacheWarning: await invalidateWebappCache(this.cacheInvalidator) };
  }

  private async prepare(
    bookId: string,
    groupId: string | null,
    input: ExpenditureGroupEdit,
  ): Promise<ExpenditureGroupWrite> {
    const parsed = parseExpenditureGroupEdit(input);
    if (parsed.status === "invalid") throw new ExpenditureGroupError(parsed.errors[0].message);
    const entries = await this.repository.entries(bookId);
    // 紐づけてよい仕訳かの判定と却下理由はドメインが持つ
    const links = validateEntryLinks(groupId, parsed.value.entryIds, entries);
    if (links.status === "invalid") throw new ExpenditureGroupError(links.errors[0].message);
    return {
      title: parsed.value.title,
      description: parsed.value.description,
      outcomes: normalizeOutcomes(parsed.value.outcomes),
      entryIds: links.value,
    };
  }
}
