import type { Book, BookMetadata } from "@/server/contexts/research-fund/domain/models/book";
import type { ResearchFundCategory, ResearchFundRow } from "@/shared/research-fund/aggregation";
export interface BookWithActivity {
  book: Book;
  draftCount: number;
  /** 仕訳ごとの法定区分の上書き（#1880）。allowed は帳簿の許可、count は上書き中の仕訳の件数 */
  legalCategoryOverride: { allowed: boolean; count: number };
  rows: ResearchFundRow[];
  accounts: Record<string, ResearchFundCategory>;
}
export interface IBookRepository {
  list(politicianId: string): Promise<BookWithActivity[]>;
  create(politicianId: string, year: number): Promise<void>;
  update(politicianId: string, bookId: string, input: BookMetadata): Promise<void>;
  /**
   * 帳簿の法定区分の上書きを許可・取り消しする。取り消しは上書き中の仕訳が残っていれば行わず、
   * 帳簿が無い場合と同じく例外を投げる。
   */
  setLegalCategoryOverrideAllowed(
    politicianId: string,
    bookId: string,
    allowed: boolean,
  ): Promise<void>;
  /** 帳簿で法定区分を上書き中の仕訳の件数。帳簿が無ければ（議員が違う場合を含む）null */
  legalCategoryOverrideCount(politicianId: string, bookId: string): Promise<number | null>;
}
