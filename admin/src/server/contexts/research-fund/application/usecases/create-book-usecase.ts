import "server-only";
import { BookError } from "@/server/contexts/research-fund/domain/types/book-error";
import { Book } from "@/server/contexts/research-fund/domain/models/book";
import { isSerialId } from "@/server/contexts/research-fund/domain/models/entity-id";
import type { IBookRepository } from "@/server/contexts/research-fund/domain/repositories/book-repository.interface";

export class CreateBookUsecase {
  constructor(private repository: IBookRepository) {}

  async execute(politicianId: string, year: number) {
    if (!isSerialId(politicianId)) throw new BookError("INVALID_ID", "IDが不正です");
    const validation = Book.validateYear(year);
    if (validation.status === "invalid")
      throw new BookError(validation.errors[0].code, validation.errors[0].message);
    await this.repository.create(politicianId, year);
  }
}
