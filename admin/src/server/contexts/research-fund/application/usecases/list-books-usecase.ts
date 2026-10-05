import "server-only";
import { BookError } from "@/server/contexts/research-fund/domain/types/book-error";
import { Book } from "@/server/contexts/research-fund/domain/models/book";
import type { IBookRepository } from "@/server/contexts/research-fund/domain/repositories/book-repository.interface";
import { aggregateResearchFund } from "@/shared/research-fund/aggregation";

export class ListBooksUsecase {
  constructor(private repository: IBookRepository) {}

  async execute(politicianId: string) {
    if (!Book.isValidId(politicianId)) throw new BookError("INVALID_ID", "IDが不正です");
    return (await this.repository.list(politicianId)).map(
      ({ book, draftCount, rows, accounts }) => {
        const result = aggregateResearchFund(rows, accounts);
        if (result.status === "invalid") throw new Error(result.errors[0].message);
        return { ...book, draftCount, ...result.value.kpi };
      },
    );
  }
}
