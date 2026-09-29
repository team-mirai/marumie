import type {
  JournalWrite,
  ReviewAccount,
  ReviewEntry,
} from "@/server/contexts/research-fund/domain/models/journal-review";
export interface JournalReviewRepository {
  list(bookId: string): Promise<ReviewEntry[]>;
  accounts(): Promise<ReviewAccount[]>;
  /** 支出と支給のどちらも返す。 */
  find(bookId: string, id: string): Promise<ReviewEntry | null>;
  /** 支出だけを返す（支給はまとめて確認済にする対象にならない）。 */
  findMany(bookId: string, ids: readonly string[]): Promise<ReviewEntry[]>;
  year(bookId: string): Promise<number | null>;
  /** 支給の起点となる当選日（YYYY-MM-DD）。帳簿が無ければ null */
  termStart(bookId: string): Promise<string | null>;
  create(bookId: string, input: JournalWrite, userId: string): Promise<string>;
  update(bookId: string, entry: ReviewEntry, input: JournalWrite): Promise<void>;
  discard(bookId: string, entry: ReviewEntry): Promise<void>;
  approveMany(bookId: string, entries: readonly ReviewEntry[]): Promise<void>;
  /** 下書きの支出の仕訳をまとめて削除する。1 件でも競合したら何も削除しない。 */
  discardMany(bookId: string, entries: readonly ReviewEntry[]): Promise<void>;
  /** 公開中の仕訳を確認済に戻す（帳簿の公開範囲は変えない）。 */
  unpublish(bookId: string, entry: ReviewEntry): Promise<void>;
  /** 確認済の支出の仕訳を下書きに戻す（支給は対象にしない）。 */
  revertToDraft(bookId: string, entry: ReviewEntry): Promise<void>;
}
