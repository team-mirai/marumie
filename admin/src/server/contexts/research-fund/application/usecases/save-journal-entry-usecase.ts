import "server-only";
import { acceptJournalEntry } from "@/server/contexts/research-fund/application/services/journal-review-targets";
import { prepareExpenseJournalWrite } from "@/server/contexts/research-fund/application/services/prepare-expense-journal-write";
import { validateGrantEntryDate } from "@/server/contexts/research-fund/domain/models/grant-registration";
import { JournalOperation } from "@/server/contexts/research-fund/domain/models/journal-operation";
import { JournalEntryHash } from "@/server/contexts/research-fund/domain/models/journal-entry-hash";
import { JournalPosting } from "@/server/contexts/research-fund/domain/models/journal-posting";
import {
  JournalReviewError,
  journalEditSchema,
  type JournalEdit,
  type JournalWrite,
  type ReviewEntry,
} from "@/server/contexts/research-fund/domain/models/journal-review";
import type { JournalReviewRepository } from "@/server/contexts/research-fund/domain/repositories/journal-review-repository.interface";

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
        JournalOperation.edit(found, input.amount) ??
        // 確認済にできるかは保存後の科目で判定する（要確認の下書きでも、科目を確定する保存なら確認済にできる）
        (approve ? JournalOperation.approve(found, input.accountKey) : null),
    );
    if (entry.source === "grant") {
      await this.repository.update(bookId, entry, await this.prepareGrant(bookId, entry, input));
      return;
    }
    const write = await prepareExpenseJournalWrite(
      this.repository,
      bookId,
      input,
      entry.source === "scan" ? "scan" : "manual",
      entry.documentId,
      approve ? "approved" : entry.status,
    );
    await this.repository.update(bookId, entry, write);
  }
  /**
   * 支給は支給日だけを直せる。金額・項目名・科目は支給の登録時に月から決まるため受け付けない。
   * 支給の「どの月の分か」は仕訳日から判定するので、月をまたぐと同じ月を二重登録できてしまう。
   * そのため支給の登録と同じ検証（その月の中・当選月は当選日以降）をここでも行う。
   */
  private async prepareGrant(
    bookId: string,
    entry: ReviewEntry,
    raw: JournalEdit,
  ): Promise<JournalWrite> {
    const parsed = journalEditSchema.safeParse(raw);
    if (!parsed.success) throw new JournalReviewError("支給日を正しく入力してください");
    const input = parsed.data;
    if (
      input.amount !== entry.amount ||
      input.description !== entry.description ||
      input.accountKey !== entry.accountKey ||
      input.note !== entry.note ||
      input.memo !== entry.memo
    )
      throw new JournalReviewError("支給は支給日だけを変更できます");
    const termStart = await this.repository.termStart(bookId);
    if (!termStart) throw new JournalReviewError("帳簿が見つかりません");
    const date = validateGrantEntryDate(entry.entryDate.slice(0, 7), termStart, input.entryDate);
    if (date.status === "invalid") throw new JournalReviewError(date.errors[0].message);
    const accounts = await this.repository.accounts();
    const account = accounts.find((a) => a.key === "grant-income");
    const assetAccount = accounts.find((a) => a.key === "bank");
    if (!account || !assetAccount) throw new JournalReviewError("科目が見つかりません");
    const posting = JournalPosting.generate({
      pattern: "grant",
      source: "grant",
      amount: entry.amount,
      account,
      assetAccount,
    });
    if (posting.status === "invalid") throw new JournalReviewError(posting.errors[0].message);
    // hash は日付を含むので、支給の登録時と同じ組み立てで作り直す。
    const hash = JournalEntryHash.generate({
      entryDate: date.value,
      amount: entry.amount,
      description: entry.description,
      documentId: null,
    });
    if (hash.status === "invalid") throw new JournalReviewError(hash.errors[0].message);
    return {
      ...input,
      entryDate: date.value,
      status: entry.status,
      hash: hash.value,
      lines: posting.value.lines,
    };
  }
}
