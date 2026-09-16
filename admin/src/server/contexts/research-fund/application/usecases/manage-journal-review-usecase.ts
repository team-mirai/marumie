import "server-only";
import { JournalEntry } from "@/server/contexts/research-fund/domain/models/journal-entry";
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

export class ManageJournalReviewUsecase {
  constructor(private repository: JournalReviewRepository) {}
  async list(bookId: string) {
    return {
      entries: await this.repository.list(bookId),
      accounts: (await this.repository.accounts()).filter((a) => a.type === "expense"),
    };
  }
  private async editable(bookId: string, id: string, updatedAt: string) {
    const entry = await this.repository.find(bookId, id);
    if (!entry) throw new JournalReviewError("仕訳が見つかりません");
    if (entry.status === "published")
      throw new JournalReviewError("公開中の仕訳は編集・破棄できません");
    if (entry.source === "grant") throw new JournalReviewError("支給は支給の登録画面で扱います");
    if (entry.updatedAt !== updatedAt)
      throw new JournalReviewError("別の操作で更新されました。画面を再読み込みしてください");
    return entry;
  }
  private async prepare(
    bookId: string,
    raw: JournalEdit,
    source: "manual" | "scan",
    documentId: string | null,
    status: JournalWrite["status"],
  ): Promise<JournalWrite> {
    const parsed = journalEditSchema.safeParse(raw);
    if (!parsed.success)
      throw new JournalReviewError("日付・金額・項目名・科目を正しく入力してください");
    const input = parsed.data;
    const year = await this.repository.year(bookId);
    if (!year || Number(input.entryDate.slice(0, 4)) !== year)
      throw new JournalReviewError("帳簿の年度内の日付を指定してください");
    if (status === "approved" && input.accountKey === "needs-review")
      throw new JournalReviewError("科目を確定してから確認済にしてください");
    const accounts = await this.repository.accounts();
    const account = accounts.find((a) => a.key === input.accountKey);
    const assetAccount = accounts.find((a) => a.key === "bank");
    if (!account || !assetAccount) throw new JournalReviewError("科目が見つかりません");
    const posting = JournalPosting.generate({
      pattern: "expense",
      source,
      amount: input.amount,
      account,
      assetAccount,
    });
    if (posting.status === "invalid") throw new JournalReviewError(posting.errors[0].message);
    const hash = JournalEntryHash.generate({ ...input, documentId });
    if (hash.status === "invalid") throw new JournalReviewError(hash.errors[0].message);
    return { ...input, status, hash: hash.value, lines: posting.value.lines };
  }
  async create(bookId: string, input: JournalEdit, userId: string) {
    return this.repository.create(
      bookId,
      await this.prepare(bookId, input, "manual", null, "draft"),
      userId,
    );
  }
  async save(bookId: string, id: string, updatedAt: string, input: JournalEdit, approve: boolean) {
    const entry = await this.editable(bookId, id, updatedAt);
    let status = entry.status;
    if (approve) {
      const result = JournalEntry.transition(entry, "approved");
      if (result.status === "invalid") throw new JournalReviewError(result.errors[0].message);
      status = result.value.status;
    }
    const write = await this.prepare(
      bookId,
      input,
      entry.source === "scan" ? "scan" : "manual",
      entry.documentId,
      status,
    );
    await this.repository.update(bookId, entry, write);
  }
  /**
   * 選んだ下書きをまとめて確認済にする。1 件ずつの「確認済にする」と同じ業務ルール
   * （科目が確定済・下書きからの遷移・同時更新の検出）を全件に適用し、
   * 1 件でも通らなければ何も変更せず、理由を利用者に返す。
   */
  async approveMany(bookId: string, targets: readonly { id: string; updatedAt: string }[]) {
    const unique = [...new Map(targets.map((target) => [target.id, target])).values()];
    if (unique.length === 0) throw new JournalReviewError("確認済にする仕訳を選んでください");
    if (unique.some((target) => !/^[1-9]\d*$/.test(target.id)))
      throw new JournalReviewError("仕訳IDが不正です");
    const entries = await this.repository.findMany(
      bookId,
      unique.map((target) => target.id),
    );
    const found = new Map(entries.map((entry) => [entry.id, entry]));
    const approving: ReviewEntry[] = [];
    const rejected: string[] = [];
    for (const target of unique) {
      const entry = found.get(target.id);
      // 支給とこの画面で扱えない形式の仕訳は findMany が返さない。
      if (!entry) rejected.push("この画面で扱えない仕訳が選ばれています");
      else if (entry.status === "published") rejected.push(`「${entry.description}」は公開中です`);
      else if (entry.updatedAt !== target.updatedAt)
        rejected.push(`「${entry.description}」は別の操作で更新されました`);
      else if (entry.accountKey === "needs-review")
        rejected.push(`「${entry.description}」は科目が未確定です`);
      else if (JournalEntry.transition(entry, "approved").status === "invalid")
        rejected.push(`「${entry.description}」は下書きではありません`);
      else approving.push(entry);
    }
    if (rejected.length > 0) {
      const reasons = [...new Set(rejected)];
      const listed = reasons.slice(0, 5).join(" / ");
      const rest = reasons.length > 5 ? ` 他${reasons.length - 5}件` : "";
      throw new JournalReviewError(
        `確認済にできない仕訳があるため、まとめて確認済にしませんでした: ${listed}${rest}。画面を再読み込みしてください`,
      );
    }
    await this.repository.approveMany(bookId, approving);
    return approving.length;
  }
  async discard(bookId: string, id: string, updatedAt: string) {
    await this.repository.discard(bookId, await this.editable(bookId, id, updatedAt));
  }
}
