import "server-only";
import { isBigIntId } from "@/server/contexts/research-fund/domain/models/entity-id";
import { submissionLedgerWarnings } from "@/server/contexts/research-fund/domain/models/submission-ledger";
import type { SubmissionLedgerRepository } from "@/server/contexts/research-fund/domain/repositories/submission-ledger-repository.interface";

/** 議員課提出用の帳簿の件数と、提出前に埋めるべき項目が欠けた仕訳。帳簿が無ければ null */
export class GetSubmissionLedgerUsecase {
  constructor(private repository: SubmissionLedgerRepository) {}
  async execute(bookId: string) {
    if (!isBigIntId(bookId)) return null;
    const ledger = await this.repository.find(bookId);
    if (!ledger) return null;
    return {
      financialYear: ledger.financialYear,
      entryCount: ledger.entries.length,
      warnings: submissionLedgerWarnings(ledger.entries),
    };
  }
}
