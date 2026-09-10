import type { Book, BookMetadata } from "@/server/contexts/research-fund/domain/models/book";
import type { ResearchFundCategory, ResearchFundRow } from "@/shared/research-fund/aggregation";
export interface BookWithActivity {
  book: Book;
  draftCount: number;
  rows: ResearchFundRow[];
  accounts: Record<string, ResearchFundCategory>;
}
export interface IBookRepository {
  list(politicianId: string): Promise<BookWithActivity[]>;
  create(politicianId: string, year: number): Promise<void>;
  update(politicianId: string, bookId: string, input: BookMetadata): Promise<void>;
}
