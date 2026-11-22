import "server-only";
import { acceptJournalEntry } from "@/server/contexts/research-fund/application/services/journal-review-targets";
import { JournalOperation } from "@/server/contexts/research-fund/domain/models/journal-operation";
import { LegalCategoryOverridePolicy } from "@/server/contexts/research-fund/domain/models/legal-category-override";
import {
  JournalReviewError,
  type JournalEdit,
} from "@/server/contexts/research-fund/domain/models/journal-review";
import type { JournalReviewRepository } from "@/server/contexts/research-fund/domain/repositories/journal-review-repository.interface";
import { buildJournalEditWrite } from "@/server/contexts/research-fund/domain/services/journal-edit-builder";

/**
 * 仕訳を 1 件編集して保存する（approve なら確認済にもする）。保存後の更新時刻を返す。
 * 何を直せるか・保存後の状態は buildJournalEditWrite（支出か支給かも含めて）が決める。
 */
export class SaveJournalEntryUsecase {
  constructor(private repository: JournalReviewRepository) {}
  async execute(
    bookId: string,
    id: string,
    updatedAt: string,
    input: JournalEdit,
    approve: boolean,
  ) {
    const entry = await acceptJournalEntry(
      this.repository,
      bookId,
      id,
      updatedAt,
      (found) =>
        JournalOperation.edit(found, input.amount, input.accountKey) ??
        // 確認済にできるかは保存後の科目で判定する（要確認の下書きでも、科目を確定する保存なら確認済にできる）
        (approve ? JournalOperation.approve(found, input.accountKey) : null),
    );
    const [year, termStart, accounts] = await Promise.all([
      this.repository.year(bookId),
      this.repository.termStart(bookId),
      this.repository.accounts(),
    ]);
    // 法定区分を上書き中の仕訳を、法定区分を持たない科目（要確認など）に変えさせない（#1880）
    const overrideRejection = LegalCategoryOverridePolicy.accountChangeRejection(
      entry.legalCategoryOverride,
      accounts.find((a) => a.key === input.accountKey)?.legalCategoryKey ?? null,
    );
    if (overrideRejection) throw new JournalReviewError(overrideRejection);
    const write = buildJournalEditWrite({ entry, raw: input, approve, year, termStart, accounts });
    if (write.status === "invalid") throw new JournalReviewError(write.errors[0].message);
    return this.repository.update(bookId, entry, write.value);
  }
}
