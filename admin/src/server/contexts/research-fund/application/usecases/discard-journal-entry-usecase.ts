import "server-only";
import { acceptJournalEntry } from "@/server/contexts/research-fund/application/services/journal-review-targets";
import { JournalOperation } from "@/server/contexts/research-fund/domain/models/journal-operation";
import type { JournalReviewRepository } from "@/server/contexts/research-fund/domain/repositories/journal-review-repository.interface";

/** 下書き・確認済の仕訳を 1 件破棄する */
export class DiscardJournalEntryUsecase {
  constructor(private repository: JournalReviewRepository) {}
  async execute(bookId: string, id: string, updatedAt: string) {
    const entry = await acceptJournalEntry(
      this.repository,
      bookId,
      id,
      updatedAt,
      JournalOperation.discard,
    );
    await this.repository.discard(bookId, entry);
  }
}
