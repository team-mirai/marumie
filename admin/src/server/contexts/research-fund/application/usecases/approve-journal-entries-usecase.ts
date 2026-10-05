import "server-only";
import {
  acceptJournalEntries,
  type JournalTarget,
} from "@/server/contexts/research-fund/application/services/journal-review-targets";
import { JournalOperation } from "@/server/contexts/research-fund/domain/models/journal-operation";
import { JournalReviewError } from "@/server/contexts/research-fund/domain/models/journal-review";
import type { JournalReviewRepository } from "@/server/contexts/research-fund/domain/repositories/journal-review-repository.interface";

/**
 * 選んだ下書きをまとめて確認済にする。1 件ずつの「確認済にする」と同じ業務ルール
 * （科目が確定済・下書きからの遷移・同時更新の検出）を全件に適用する。
 * 科目が未確定（要確認）の下書きは除外して残りを確認済にし、除外した件数を返す。
 * それ以外の理由で通らない仕訳が 1 件でもあれば何も変更せず、理由を利用者に返す。
 */
export class ApproveJournalEntriesUsecase {
  constructor(private repository: JournalReviewRepository) {}
  async execute(bookId: string, targets: readonly JournalTarget[]) {
    const accepted = await acceptJournalEntries(
      this.repository,
      bookId,
      targets,
      JournalOperation.approve,
      {
        action: "確認済にする",
        cannot: "確認済にできない",
        notDone: "確認済にしませんでした",
      },
    );
    const approving = accepted.filter((entry) => entry.accountKey !== "needs-review");
    if (approving.length === 0)
      throw new JournalReviewError(
        "選んだ仕訳はすべて科目が要確認のため、確認済にできる仕訳がありません。科目を確定してください",
      );
    await this.repository.approveMany(bookId, approving);
    return { approved: approving.length, skipped: accepted.length - approving.length };
  }
}
