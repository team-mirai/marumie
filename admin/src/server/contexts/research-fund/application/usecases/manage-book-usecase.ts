import "server-only";
import { BookError } from "@/server/contexts/research-fund/domain/types/book-error";
import { Book, type BookMetadata } from "@/server/contexts/research-fund/domain/models/book";
import type { IBookRepository } from "@/server/contexts/research-fund/domain/repositories/book-repository.interface";
import { aggregateResearchFund } from "@/shared/research-fund/aggregation";
function validateId(id: string) {
  if (!/^[1-9]\d*$/.test(id)) throw new BookError("INVALID_ID", "IDが不正です");
}
export class ManageBookUsecase {
  constructor(private repository: IBookRepository) {}
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
  }
}
