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
}
