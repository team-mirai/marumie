import "server-only";
import { acceptJournalEntry } from "@/server/contexts/research-fund/application/services/journal-review-targets";
import { prepareExpenseJournalWrite } from "@/server/contexts/research-fund/application/services/prepare-expense-journal-write";
import { JournalOperation } from "@/server/contexts/research-fund/domain/models/journal-operation";
import {
  JournalReviewError,
  journalEditSchema,
  type JournalEdit,
  type JournalWrite,
  type ReviewEntry,
} from "@/server/contexts/research-fund/domain/models/journal-review";
import type { JournalReviewRepository } from "@/server/contexts/research-fund/domain/repositories/journal-review-repository.interface";
import { buildGrantJournalWrite } from "@/server/contexts/research-fund/domain/services/grant-journal-builder";

/** 仕訳を 1 件編集して保存する（approve なら確認済にもする） */
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
    const write =
      entry.source === "grant"
        ? await this.prepareGrant(bookId, entry, input)
        : await prepareExpenseJournalWrite(
            this.repository,
            bookId,
            input,
            entry.source === "scan" ? "scan" : "manual",
            entry.documentId,
            approve ? "approved" : entry.status,
          );
    await this.repository.update(bookId, entry, write);
  }
  /** 支給は支給日だけを直せる。何を直せるかは JournalOperation、組み立ては buildGrantJournalWrite が判定する */
  private async prepareGrant(
    bookId: string,
    entry: ReviewEntry,
    raw: JournalEdit,
  ): Promise<JournalWrite> {
    const parsed = journalEditSchema.safeParse(raw);
    if (!parsed.success) throw new JournalReviewError("支給日を正しく入力してください");
    const input = parsed.data;
    const rejection = JournalOperation.editGrant(entry, input);
    if (rejection) throw new JournalReviewError(rejection.one);
    const termStart = await this.repository.termStart(bookId);
    if (!termStart) throw new JournalReviewError("帳簿が見つかりません");
    const write = buildGrantJournalWrite({
      // どの月の支給かは登録時の仕訳日が持つ。項目名は hash を変えないため保存済みのものを渡す。
      month: entry.entryDate.slice(0, 7),
      termStart,
      entryDate: input.entryDate,
      amount: entry.amount,
      description: entry.description,
      accounts: await this.repository.accounts(),
    });
    if (write.status === "invalid") throw new JournalReviewError(write.errors[0].message);
    return {
      ...input,
      entryDate: write.value.entryDate,
      status: entry.status,
      hash: write.value.hash,
      lines: write.value.lines,
    };
  }
}
