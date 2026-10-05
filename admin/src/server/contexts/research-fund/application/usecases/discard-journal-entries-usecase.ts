import "server-only";
import {
  acceptJournalEntries,
  type JournalTarget,
} from "@/server/contexts/research-fund/application/services/journal-review-targets";
import { JournalOperation } from "@/server/contexts/research-fund/domain/models/journal-operation";
import type { JournalReviewRepository } from "@/server/contexts/research-fund/domain/repositories/journal-review-repository.interface";

/**
 * 選んだ下書き・確認済の仕訳をまとめて破棄する。1 件ずつの「破棄」と同じ業務ルールを全件に適用する。
 * 確認済は公開ページに出ないので、webapp のキャッシュは無効化しない。
 */
export class DiscardJournalEntriesUsecase {
  constructor(private repository: JournalReviewRepository) {}
  async execute(bookId: string, targets: readonly JournalTarget[]) {
    const discarding = await acceptJournalEntries(
      this.repository,
      bookId,
      targets,
      JournalOperation.discard,
      {
        action: "破棄する",
        cannot: "破棄できない",
        notDone: "破棄しませんでした",
      },
    );
    await this.repository.discardMany(bookId, discarding);
    return { discarded: discarding.length };
  }
}
