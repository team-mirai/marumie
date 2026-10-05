import "server-only";
import {
  acceptJournalEntries,
  type JournalTarget,
} from "@/server/contexts/research-fund/application/services/journal-review-targets";
import { JournalOperation } from "@/server/contexts/research-fund/domain/models/journal-operation";
import type { JournalReviewRepository } from "@/server/contexts/research-fund/domain/repositories/journal-review-repository.interface";

/** 選んだ精算済の立替をまとめて未精算に戻す（誤操作の取り消し）。全件か無しで扱う。 */
export class UnsettleJournalEntriesUsecase {
  constructor(private repository: JournalReviewRepository) {}
  async execute(bookId: string, targets: readonly JournalTarget[]) {
    const unsettling = await acceptJournalEntries(
      this.repository,
      bookId,
      targets,
      JournalOperation.unsettle,
      {
        action: "未精算に戻す",
        cannot: "未精算に戻せない",
        notDone: "未精算に戻しませんでした",
      },
    );
    await this.repository.unsettleMany(bookId, unsettling);
    return { unsettled: unsettling.length };
  }
}
