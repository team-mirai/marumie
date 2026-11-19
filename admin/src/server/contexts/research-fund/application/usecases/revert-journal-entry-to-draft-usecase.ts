import "server-only";
import { acceptJournalEntry } from "@/server/contexts/research-fund/application/services/journal-review-targets";
import { JournalOperation } from "@/server/contexts/research-fund/domain/models/journal-operation";
import type { JournalReviewRepository } from "@/server/contexts/research-fund/domain/repositories/journal-review-repository.interface";

/**
 * 確認済の支出の仕訳を下書きに戻し、確認待ちとして扱い直せるようにする。
 * 支給は下書きを経ずに確認済で作る仕様なので戻さない。公開中の仕訳は先に確認済に戻す。
 * 確認済は公開ページに出ないので、webapp のキャッシュは無効化しない。
 */
export class RevertJournalEntryToDraftUsecase {
  constructor(private repository: JournalReviewRepository) {}
  async execute(bookId: string, id: string, updatedAt: string) {
    const entry = await acceptJournalEntry(
      this.repository,
      bookId,
      id,
      updatedAt,
      JournalOperation.revertToDraft,
    );
    await this.repository.revertToDraft(bookId, entry);
  }
}
