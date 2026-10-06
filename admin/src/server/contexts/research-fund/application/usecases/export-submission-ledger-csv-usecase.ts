import "server-only";
import { isBigIntId } from "@/server/contexts/research-fund/domain/models/entity-id";
import {
  buildSubmissionLedgerCsv,
  submissionLedgerFilename,
  type ParliamentHouse,
} from "@/server/contexts/research-fund/domain/models/submission-ledger";
import type { SubmissionLedgerRepository } from "@/server/contexts/research-fund/domain/repositories/submission-ledger-repository.interface";

/** 議員課提出用の帳簿を院のフォーマットの CSV にする。帳簿が無ければ null */
export class ExportSubmissionLedgerCsvUsecase {
  constructor(private repository: SubmissionLedgerRepository) {}
  async execute(bookId: string, house: ParliamentHouse) {
    if (!isBigIntId(bookId)) return null;
    const ledger = await this.repository.find(bookId);
    if (!ledger) return null;
    return {
      filename: submissionLedgerFilename(house, ledger.financialYear),
      csv: buildSubmissionLedgerCsv(house, ledger, ledger.entries),
    };
  }
}
