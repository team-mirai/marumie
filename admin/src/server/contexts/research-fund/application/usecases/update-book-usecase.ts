import "server-only";
import { BookError } from "@/server/contexts/research-fund/domain/types/book-error";
import { Book, type BookMetadata } from "@/server/contexts/research-fund/domain/models/book";
import type { IBookRepository } from "@/server/contexts/research-fund/domain/repositories/book-repository.interface";
import type { ICacheInvalidator } from "@/server/contexts/shared/domain/services/cache-invalidator.interface";

export class UpdateBookUsecase {
  constructor(
    private repository: IBookRepository,
    private cacheInvalidator: ICacheInvalidator,
  ) {}

  async execute(politicianId: string, bookId: string, input: BookMetadata) {
    if (!Book.isValidId(politicianId) || !Book.isValidId(bookId))
      throw new BookError("INVALID_ID", "IDが不正です");
    const validation = Book.validateMetadata(input);
    if (validation.status === "invalid")
      throw new BookError(validation.errors[0].code, validation.errors[0].message);
    await this.repository.update(politicianId, bookId, {
      asOfDate: validation.value.asOfDate,
      nextUpdateNote: validation.value.nextUpdateNote.trim(),
      policyComment: validation.value.policyComment,
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
