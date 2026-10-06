import "server-only";
import { invalidateWebappCache } from "@/server/contexts/research-fund/application/services/invalidate-webapp-cache";
import { BookError } from "@/server/contexts/research-fund/domain/types/book-error";
import { Book, type BookMetadata } from "@/server/contexts/research-fund/domain/models/book";
import { isSerialId } from "@/server/contexts/research-fund/domain/models/entity-id";
import type { IBookRepository } from "@/server/contexts/research-fund/domain/repositories/book-repository.interface";
import type { ICacheInvalidator } from "@/server/contexts/shared/domain/services/cache-invalidator.interface";

export class UpdateBookUsecase {
  constructor(
    private repository: IBookRepository,
    private cacheInvalidator: ICacheInvalidator,
  ) {}

  async execute(politicianId: string, bookId: string, input: BookMetadata) {
    if (!isSerialId(politicianId) || !isSerialId(bookId))
      throw new BookError("INVALID_ID", "IDが不正です");
    const validation = Book.validateMetadata(input);
    if (validation.status === "invalid")
      throw new BookError(validation.errors[0].code, validation.errors[0].message);
    await this.repository.update(politicianId, bookId, {
      asOfDate: validation.value.asOfDate,
      nextUpdateNote: validation.value.nextUpdateNote.trim(),
      policyComment: validation.value.policyComment,
    });
    return { cacheWarning: await invalidateWebappCache(this.cacheInvalidator) };
  }
}
