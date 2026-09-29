import "server-only";
import { validateGrantEntryDate } from "@/server/contexts/research-fund/domain/models/grant-registration";
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
import type { ICacheInvalidator } from "@/server/contexts/shared/domain/services/cache-invalidator.interface";

export class ManageJournalReviewUsecase {
  constructor(
    private repository: JournalReviewRepository,
    private cacheInvalidator: ICacheInvalidator,
  ) {}
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
    if (entry.source === "grant") {
      if (approve) throw new JournalReviewError("支給はすでに確認済です");
      await this.repository.update(bookId, entry, await this.prepareGrant(bookId, entry, input));
      return;
    }
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
  /** まとめて操作する仕訳を重複を畳んで取得する。支給とこの画面で扱えない形式は found に含まれない。 */
  private async findTargets(
    bookId: string,
    targets: readonly { id: string; updatedAt: string }[],
    action: string,
  ) {
    const unique = [...new Map(targets.map((target) => [target.id, target])).values()];
    if (unique.length === 0) throw new JournalReviewError(`${action}仕訳を選んでください`);
    if (unique.some((target) => !/^[1-9]\d*$/.test(target.id)))
      throw new JournalReviewError("仕訳IDが不正です");
    const entries = await this.repository.findMany(
      bookId,
      unique.map((target) => target.id),
    );
    return { unique, found: new Map(entries.map((entry) => [entry.id, entry])) };
  }
  /**
   * 選んだ下書きをまとめて確認済にする。1 件ずつの「確認済にする」と同じ業務ルール
   * （科目が確定済・下書きからの遷移・同時更新の検出）を全件に適用する。
   * 科目が未確定（要確認）の下書きは除外して残りを確認済にし、除外した件数を返す。
   * それ以外の理由で通らない仕訳が 1 件でもあれば何も変更せず、理由を利用者に返す。
   */
  async approveMany(bookId: string, targets: readonly { id: string; updatedAt: string }[]) {
    const { unique, found } = await this.findTargets(bookId, targets, "確認済にする");
    const approving: ReviewEntry[] = [];
    const rejected: string[] = [];
    let skipped = 0;
    for (const target of unique) {
      const entry = found.get(target.id);
      // 支給とこの画面で扱えない形式の仕訳は findMany が返さない。
      if (!entry) rejected.push("この画面で扱えない仕訳が選ばれています");
      else if (entry.status === "published") rejected.push(`「${entry.description}」は公開中です`);
      else if (entry.updatedAt !== target.updatedAt)
        rejected.push(`「${entry.description}」は別の操作で更新されました`);
      else if (JournalEntry.transition(entry, "approved").status === "invalid")
        rejected.push(`「${entry.description}」は下書きではありません`);
      else if (entry.accountKey === "needs-review") skipped++;
      else approving.push(entry);
    }
    if (rejected.length > 0) throw rejectMany(rejected, "確認済に");
    if (approving.length === 0)
      throw new JournalReviewError(
        "選んだ仕訳はすべて科目が要確認のため、確認済にできる仕訳がありません。科目を確定してください",
      );
    await this.repository.approveMany(bookId, approving);
    return { approved: approving.length, skipped };
  }
  /**
   * 公開中の仕訳を確認済に戻し、公開ページから取り下げる。
   * 帳簿の公開範囲（publishedThrough）は後退させない。同じ月の他の仕訳は公開中のまま残るうえ、
   * 戻した仕訳は修正して再公開する運用を想定しているため。
   */
  async unpublish(bookId: string, id: string, updatedAt: string) {
    const entry = await this.repository.find(bookId, id);
    if (!entry) throw new JournalReviewError("仕訳が見つかりません");
    if (entry.status !== "published")
      throw new JournalReviewError("公開中の仕訳だけを確認済に戻せます");
    if (entry.updatedAt !== updatedAt)
      throw new JournalReviewError("別の操作で更新されました。画面を再読み込みしてください");
    const result = JournalEntry.transition(entry, "approved");
    if (result.status === "invalid") throw new JournalReviewError(result.errors[0].message);
    await this.repository.unpublish(bookId, entry);
    // 取り下げ自体は確定しているので、キャッシュ無効化の失敗は警告として返す（公開と同じ扱い）。
    let cacheWarning: string | null = null;
    try {
      await this.cacheInvalidator.invalidateWebappCache();
    } catch (error) {
      cacheWarning =
        error instanceof Error ? error.message : "ウェブアプリのキャッシュを更新できませんでした";
    }
    return { cacheWarning };
  }
  /**
   * 確認済の支出の仕訳を下書きに戻し、確認待ちとして扱い直せるようにする。
   * 支給は下書きを経ずに確認済で作る仕様なので戻さない。公開中の仕訳は先に確認済に戻す。
   * 確認済は公開ページに出ないので、webapp のキャッシュは無効化しない。
   */
  async revertToDraft(bookId: string, id: string, updatedAt: string) {
    const entry = await this.repository.find(bookId, id);
    if (!entry) throw new JournalReviewError("仕訳が見つかりません");
    if (entry.source === "grant") throw new JournalReviewError("支給は下書きに戻せません");
    if (entry.status !== "approved")
      throw new JournalReviewError("確認済の仕訳だけを下書きに戻せます");
    if (entry.updatedAt !== updatedAt)
      throw new JournalReviewError("別の操作で更新されました。画面を再読み込みしてください");
    const result = JournalEntry.transition(entry, "draft");
    if (result.status === "invalid") throw new JournalReviewError(result.errors[0].message);
    await this.repository.revertToDraft(bookId, entry);
  }
  /**
   * 選んだ下書きをまとめて破棄する。確認済・公開中・支給・同時更新された仕訳が 1 件でもあれば
   * 何も削除せず、理由を利用者に返す（一部だけ消える中途半端な状態にしない）。
   */
  async discardMany(bookId: string, targets: readonly { id: string; updatedAt: string }[]) {
    const { unique, found } = await this.findTargets(bookId, targets, "破棄する");
    const discarding: ReviewEntry[] = [];
    const rejected: string[] = [];
    for (const target of unique) {
      const entry = found.get(target.id);
      if (!entry) rejected.push("この画面で扱えない仕訳が選ばれています");
      else if (entry.status === "published") rejected.push(`「${entry.description}」は公開中です`);
      else if (entry.updatedAt !== target.updatedAt)
        rejected.push(`「${entry.description}」は別の操作で更新されました`);
      else if (entry.status !== "draft")
        rejected.push(`「${entry.description}」は下書きではありません`);
      else discarding.push(entry);
    }
    if (rejected.length > 0) throw rejectMany(rejected, "破棄");
    await this.repository.discardMany(bookId, discarding);
    return { discarded: discarding.length };
  }
  async discard(bookId: string, id: string, updatedAt: string) {
    const entry = await this.editable(bookId, id, updatedAt);
    if (entry.source === "grant") throw new JournalReviewError("支給は破棄できません");
    await this.repository.discard(bookId, entry);
  }
}
function rejectMany(rejected: readonly string[], action: string) {
  const reasons = [...new Set(rejected)];
  const listed = reasons.slice(0, 5).join(" / ");
  const rest = reasons.length > 5 ? ` 他${reasons.length - 5}件` : "";
  return new JournalReviewError(
    `${action}できない仕訳があるため、まとめて${action}しませんでした: ${listed}${rest}。画面を再読み込みしてください`,
  );
}
