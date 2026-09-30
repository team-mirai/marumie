import "server-only";
import { BookError } from "@/server/contexts/research-fund/domain/types/book-error";
import { Book, type BookMetadata } from "@/server/contexts/research-fund/domain/models/book";
import type { IBookRepository } from "@/server/contexts/research-fund/domain/repositories/book-repository.interface";
import type { ICacheInvalidator } from "@/server/contexts/shared/domain/services/cache-invalidator.interface";
import { aggregateResearchFund } from "@/shared/research-fund/aggregation";
function validateId(id: string) {
  if (!/^[1-9]\d*$/.test(id)) throw new BookError("INVALID_ID", "IDが不正です");
}
export class ManageBookUsecase {
  constructor(
    private repository: IBookRepository,
    private cacheInvalidator: ICacheInvalidator,
  ) {}
  async list(politicianId: string) {
    validateId(politicianId);
    return (await this.repository.list(politicianId)).map(
      ({ book, draftCount, rows, accounts }) => {
        const result = aggregateResearchFund(rows, accounts);
        if (result.status === "invalid") throw new Error(result.errors[0].message);
        return { ...book, draftCount, ...result.value.kpi };
      },
    );
  }
  async create(politicianId: string, year: number) {
    validateId(politicianId);
    const validation = Book.validateYear(year);
    if (validation.status === "invalid")
      throw new BookError(validation.errors[0].code, validation.errors[0].message);
    await this.repository.create(politicianId, year);
  }
  async update(politicianId: string, bookId: string, input: BookMetadata) {
    validateId(politicianId);
    validateId(bookId);
    const validation = Book.validateMetadata(input);
    if (validation.status === "invalid")
      throw new BookError(validation.errors[0].code, validation.errors[0].message);
    await this.repository.update(politicianId, bookId, {
      asOfDate: input.asOfDate,
      nextUpdateNote: input.nextUpdateNote.trim(),
      policyComment: input.policyComment.trim(),
    });
    // 時点・次回更新の予定・活用方針は公開ページに出るので、webapp のキャッシュを消す。
    // 保存自体は確定しているので、キャッシュ無効化の失敗は警告として返す（仕訳の公開と同じ扱い）。
    try {
      await this.cacheInvalidator.invalidateWebappCache();
      return { cacheWarning: null };
    } catch (error) {
      return {
        cacheWarning:
          error instanceof Error ? error.message : "ウェブアプリのキャッシュを更新できませんでした",
      };
    }
  }
}
