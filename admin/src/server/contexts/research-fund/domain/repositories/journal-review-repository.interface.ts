import type {
  JournalWrite,
  ReviewAccount,
  ReviewEntry,
} from "@/server/contexts/research-fund/domain/models/journal-review";
export interface JournalReviewRepository {
  list(bookId: string): Promise<ReviewEntry[]>;
  accounts(): Promise<ReviewAccount[]>;
  find(bookId: string, id: string): Promise<ReviewEntry | null>;
  year(bookId: string): Promise<number | null>;
  create(bookId: string, input: JournalWrite, userId: string): Promise<string>;
  update(bookId: string, entry: ReviewEntry, input: JournalWrite): Promise<void>;
  discard(bookId: string, entry: ReviewEntry): Promise<void>;
}
