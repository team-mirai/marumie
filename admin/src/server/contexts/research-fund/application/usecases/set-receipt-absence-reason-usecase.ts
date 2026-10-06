import "server-only";
import { acceptJournalEntry } from "@/server/contexts/research-fund/application/services/journal-review-targets";
import { JournalOperation } from "@/server/contexts/research-fund/domain/models/journal-operation";
import { JournalReviewError } from "@/server/contexts/research-fund/domain/models/journal-review";
import { validateReceiptAbsenceReason } from "@/server/contexts/research-fund/domain/models/receipt-absence";
import type { JournalReviewRepository } from "@/server/contexts/research-fund/domain/repositories/journal-review-repository.interface";

/**
 * 書類の無い支出の仕訳に、領収書等を徴し難かった事情を書く・直す・消す（空白だけの入力は削除）。
 *
 * 事情は議員課提出用の帳簿の情報で公開内容を変えないので、公開中の仕訳でも変更でき、
 * webapp のキャッシュは無効化しない。
 */
export class SetReceiptAbsenceReasonUsecase {
  constructor(private repository: JournalReviewRepository) {}
  async execute(bookId: string, id: string, updatedAt: string, reason: string) {
    const validated = validateReceiptAbsenceReason(reason);
    if (validated.status === "invalid") throw new JournalReviewError(validated.errors[0].message);
    const entry = await acceptJournalEntry(
      this.repository,
      bookId,
      id,
      updatedAt,
      JournalOperation.setReceiptAbsenceReason,
    );
    await this.repository.setReceiptAbsenceReason(bookId, entry, validated.value);
    return { receiptAbsenceReason: validated.value };
  }
}
