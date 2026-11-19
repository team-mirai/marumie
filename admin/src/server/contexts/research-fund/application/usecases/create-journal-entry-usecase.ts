import "server-only";
import { prepareExpenseJournalWrite } from "@/server/contexts/research-fund/application/services/prepare-expense-journal-write";
import type { JournalEdit } from "@/server/contexts/research-fund/domain/models/journal-review";
import type { JournalReviewRepository } from "@/server/contexts/research-fund/domain/repositories/journal-review-repository.interface";

/** 支出の仕訳を手動で作成する（下書きで作る） */
export class CreateJournalEntryUsecase {
  constructor(private repository: JournalReviewRepository) {}
  async execute(bookId: string, input: JournalEdit, userId: string) {
    return this.repository.create(
      bookId,
      await prepareExpenseJournalWrite(this.repository, bookId, input, "manual", null, "draft"),
      userId,
    );
  }
}
