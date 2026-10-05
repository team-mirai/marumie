import "server-only";
import {
  acceptJournalEntries,
  type JournalTarget,
} from "@/server/contexts/research-fund/application/services/journal-review-targets";
import { JournalOperation } from "@/server/contexts/research-fund/domain/models/journal-operation";
import type { JournalReviewRepository } from "@/server/contexts/research-fund/domain/repositories/journal-review-repository.interface";

/**
 * 選んだ確認済の仕訳をまとめて下書きに戻す。1 件ずつの「下書きに戻す」と同じ業務ルールを全件に適用する。
 * 確認済は公開ページに出ないので、webapp のキャッシュは無効化しない。
 */
export class RevertJournalEntriesToDraftUsecase {
  constructor(private repository: JournalReviewRepository) {}
  async execute(bookId: string, targets: readonly JournalTarget[]) {
    const reverting = await acceptJournalEntries(
      this.repository,
      bookId,
      targets,
      JournalOperation.revertToDraft,
      {
        action: "下書きに戻す",
        cannot: "下書きに戻せない",
        notDone: "下書きに戻しませんでした",
      },
    );
    await this.repository.revertManyToDraft(bookId, reverting);
    return { reverted: reverting.length };
  }
}
