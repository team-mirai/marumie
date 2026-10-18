import "server-only";
import { isBigIntId } from "@/server/contexts/research-fund/domain/models/entity-id";
import {
  RECEIPT_PRINT_SCOPES,
  type ReceiptPrintScope,
  selectReceiptPrintDocuments,
} from "@/server/contexts/research-fund/domain/models/receipt-print";
import { submissionLedgerWarnings } from "@/server/contexts/research-fund/domain/models/submission-ledger";
import type { SubmissionLedgerRepository } from "@/server/contexts/research-fund/domain/repositories/submission-ledger-repository.interface";

interface ReceiptPrintCount {
  /** 印刷用 PDF に入る書類の件数 */
  readonly documentCount: number;
  /** 範囲内だが未採番で PDF に入らない書類の件数 */
  readonly unnumberedCount: number;
}

/**
 * 議員課提出用の帳簿の件数、提出前に埋めるべき項目が欠けた仕訳、
 * 領収書の印刷用 PDF に入る書類の件数（範囲ごと）。帳簿が無ければ null
 */
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
      receiptPrintCounts: Object.fromEntries(
        RECEIPT_PRINT_SCOPES.map((scope) => {
          const selection = selectReceiptPrintDocuments(ledger.entries, scope);
          return [
            scope,
            {
              documentCount: selection.documents.length,
              unnumberedCount: selection.unnumberedCount,
            },
          ];
        }),
      ) as Record<ReceiptPrintScope, ReceiptPrintCount>,
    };
  }
}
