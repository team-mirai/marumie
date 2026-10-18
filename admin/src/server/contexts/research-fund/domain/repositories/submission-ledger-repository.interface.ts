import type {
  SubmissionLedgerBook,
  SubmissionLedgerEntry,
} from "@/server/contexts/research-fund/domain/models/submission-ledger";

export interface SubmissionLedger extends SubmissionLedgerBook {
  /** 公開済みの支出の仕訳を日付の古い順に返す */
  readonly entries: readonly SubmissionLedgerEntry[];
}

export interface SubmissionLedgerRepository {
  /** 帳簿が無ければ null */
  find(bookId: string): Promise<SubmissionLedger | null>;
  /** 帳簿の書類のストレージ上のキー（書類 ID → キー）。帳簿に属さない書類は含めない */
  findDocumentStorageKeys(
    bookId: string,
    documentIds: readonly string[],
  ): Promise<ReadonlyMap<string, string>>;
}
