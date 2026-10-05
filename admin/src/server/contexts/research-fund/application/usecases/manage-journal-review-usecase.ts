import "server-only";
import {
  todayInJst,
  validateAdvancedBy,
  validateSettlementDate,
} from "@/server/contexts/research-fund/domain/models/advance";
import { validateGrantEntryDate } from "@/server/contexts/research-fund/domain/models/grant-registration";
import {
  JournalOperation,
  type OperationRejection,
} from "@/server/contexts/research-fund/domain/models/journal-operation";
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
      // 立替者の入力欄の候補。表記ゆれで立替者ごとの集計が分かれないようにする。
      advancers: await this.repository.advancers(bookId),
    };
  }
  /** 1 件の操作の対象を取得し、同時更新を検出してから、まとめて操作と同じ判定（judge）を適用する */
  private async accept(
    bookId: string,
    id: string,
    updatedAt: string,
    judge: (entry: ReviewEntry) => OperationRejection | null,
  ) {
    const entry = await this.repository.find(bookId, id);
    if (!entry) throw new JournalReviewError("仕訳が見つかりません");
    if (entry.updatedAt !== updatedAt)
      throw new JournalReviewError("別の操作で更新されました。画面を再読み込みしてください");
    const rejection = judge(entry);
    if (rejection) throw new JournalReviewError(rejection.one);
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
    const entry = await this.accept(
      bookId,
      id,
      updatedAt,
      (found) =>
        JournalOperation.edit(found, input.amount) ??
        (approve ? JournalOperation.approve(found) : null),
    );
    if (entry.source === "grant") {
      await this.repository.update(bookId, entry, await this.prepareGrant(bookId, entry, input));
      return;
    }
    const write = await this.prepare(
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
  /**
   * まとめて操作する仕訳を重複を畳んで取得し、全件に 1 件の操作と同じ判定（judge）を適用する。
   * 受け付けない仕訳が 1 件でもあれば何も変更せず、理由を利用者に返す（一部だけ変わる中途半端な状態にしない）。
   * 取得できない仕訳（支給・この画面で扱えない形式・別帳簿）は黙って除外せず、missing を理由に拒否する。
   */
  private async acceptMany(
    bookId: string,
    targets: readonly { id: string; updatedAt: string }[],
    judge: (entry: ReviewEntry) => OperationRejection | null,
    messages: { action: string; cannot: string; notDone: string; missing?: string },
  ) {
    const unique = [...new Map(targets.map((target) => [target.id, target])).values()];
    if (unique.length === 0) throw new JournalReviewError(`${messages.action}仕訳を選んでください`);
    if (unique.some((target) => !/^[1-9]\d*$/.test(target.id)))
      throw new JournalReviewError("仕訳IDが不正です");
    const found = new Map(
      (
        await this.repository.findMany(
          bookId,
          unique.map((target) => target.id),
        )
      ).map((entry) => [entry.id, entry]),
    );
    const accepted: ReviewEntry[] = [];
    const rejected: string[] = [];
    for (const target of unique) {
      const entry = found.get(target.id);
      if (!entry) {
        rejected.push(messages.missing ?? "この画面で扱えない仕訳が選ばれています");
        continue;
      }
      if (entry.updatedAt !== target.updatedAt) {
        rejected.push(`「${entry.description}」は別の操作で更新されました`);
        continue;
      }
      const rejection = judge(entry);
      if (rejection) rejected.push(rejection.many);
      else accepted.push(entry);
    }
    if (rejected.length > 0) throw rejectMany(rejected, messages.cannot, messages.notDone);
    return accepted;
  }
  /**
   * 選んだ下書きをまとめて確認済にする。1 件ずつの「確認済にする」と同じ業務ルール
   * （科目が確定済・下書きからの遷移・同時更新の検出）を全件に適用する。
   * 科目が未確定（要確認）の下書きは除外して残りを確認済にし、除外した件数を返す。
   * それ以外の理由で通らない仕訳が 1 件でもあれば何も変更せず、理由を利用者に返す。
   */
  async approveMany(bookId: string, targets: readonly { id: string; updatedAt: string }[]) {
    const accepted = await this.acceptMany(bookId, targets, JournalOperation.approve, {
      action: "確認済にする",
      cannot: "確認済にできない",
      notDone: "確認済にしませんでした",
    });
    const approving = accepted.filter((entry) => entry.accountKey !== "needs-review");
    if (approving.length === 0)
      throw new JournalReviewError(
        "選んだ仕訳はすべて科目が要確認のため、確認済にできる仕訳がありません。科目を確定してください",
      );
    await this.repository.approveMany(bookId, approving);
    return { approved: approving.length, skipped: accepted.length - approving.length };
  }
  /**
   * 公開中の仕訳を確認済に戻し、公開ページから取り下げる。
   * 帳簿の公開範囲（publishedThrough）は、残った公開中の仕訳の最新月末を超えないよう戻す
   * （公開中の仕訳が無くなれば未設定）。日付を誤った仕訳を取り下げたときに、公開ページの
   * 「〜支給分」が実データより先の月を指したまま残らないようにするため。
   */
  async unpublish(bookId: string, id: string, updatedAt: string) {
    const entry = await this.accept(bookId, id, updatedAt, JournalOperation.unpublish);
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
    const entry = await this.accept(bookId, id, updatedAt, JournalOperation.revertToDraft);
    await this.repository.revertToDraft(bookId, entry);
  }
  /**
   * 選んだ確認済の仕訳をまとめて下書きに戻す。1 件ずつの「下書きに戻す」と同じ業務ルールを全件に適用する。
   * 確認済は公開ページに出ないので、webapp のキャッシュは無効化しない。
   */
  async revertManyToDraft(bookId: string, targets: readonly { id: string; updatedAt: string }[]) {
    const reverting = await this.acceptMany(bookId, targets, JournalOperation.revertToDraft, {
      action: "下書きに戻す",
      cannot: "下書きに戻せない",
      notDone: "下書きに戻しませんでした",
    });
    await this.repository.revertManyToDraft(bookId, reverting);
    return { reverted: reverting.length };
  }
  /**
   * 選んだ下書き・確認済の仕訳をまとめて破棄する。1 件ずつの「破棄」と同じ業務ルールを全件に適用する。
   * 確認済は公開ページに出ないので、webapp のキャッシュは無効化しない。
   */
  async discardMany(bookId: string, targets: readonly { id: string; updatedAt: string }[]) {
    const discarding = await this.acceptMany(bookId, targets, JournalOperation.discard, {
      action: "破棄する",
      cannot: "破棄できない",
      notDone: "破棄しませんでした",
    });
    await this.repository.discardMany(bookId, discarding);
    return { discarded: discarding.length };
  }
  async discard(bookId: string, id: string, updatedAt: string) {
    const entry = await this.accept(bookId, id, updatedAt, JournalOperation.discard);
    await this.repository.discard(bookId, entry);
  }
  /**
   * 選んだ支出の仕訳の立替者をまとめて設定・解除する（空白だけの入力は解除）。
   *
   * 立替は仕訳として計上しない事務所内の管理情報なので、公開中の仕訳でも変更できる。
   * 公開内容（日付・金額・項目名・科目・特記事項）は変わらないので、webapp のキャッシュは無効化しない。
   */
  async setAdvancedBy(
    bookId: string,
    targets: readonly { id: string; updatedAt: string }[],
    advancedBy: string,
  ) {
    const validated = validateAdvancedBy(advancedBy);
    if (validated.status === "invalid") throw new JournalReviewError(validated.errors[0].message);
    const updating = await this.acceptMany(bookId, targets, JournalOperation.setAdvancedBy, {
      action: "立替者を設定する",
      cannot: "立替者を設定できない",
      notDone: "変更しませんでした",
      missing: "立替者を設定できない仕訳（支給・返還など）が選ばれています",
    });
    await this.repository.setAdvancedBy(bookId, updating, validated.value);
    return { updated: updating.length, advancedBy: validated.value };
  }
  /**
   * 選んだ未精算の立替をまとめて精算済にする。精算は「立替者へまとめてお金を移した」記録なので、
   * 金額が確定した確認済・公開中の仕訳だけを対象にする（既存のまとめて操作と同じ「全件か無し」の扱い）。
   * 精算は公開内容を変えないので、webapp のキャッシュは無効化しない。
   */
  async settleMany(
    bookId: string,
    targets: readonly { id: string; updatedAt: string }[],
    settledAt: string,
  ) {
    const settling = await this.acceptMany(bookId, targets, JournalOperation.settle, {
      action: "精算する",
      cannot: "精算できない",
      notDone: "精算しませんでした",
      missing: "精算できない仕訳（支給・返還など）が選ばれています",
    });
    const date = validateSettlementDate(
      settledAt,
      settling.map((entry) => entry.entryDate),
      todayInJst(new Date()),
    );
    if (date.status === "invalid") throw new JournalReviewError(date.errors[0].message);
    await this.repository.settleMany(bookId, settling, date.value);
    return { settled: settling.length, settledAt: date.value };
  }
  /** 選んだ精算済の立替をまとめて未精算に戻す（誤操作の取り消し）。全件か無しで扱う。 */
  async unsettleMany(bookId: string, targets: readonly { id: string; updatedAt: string }[]) {
    const unsettling = await this.acceptMany(bookId, targets, JournalOperation.unsettle, {
      action: "未精算に戻す",
      cannot: "未精算に戻せない",
      notDone: "未精算に戻しませんでした",
    });
    await this.repository.unsettleMany(bookId, unsettling);
    return { unsettled: unsettling.length };
  }
}
function rejectMany(rejected: readonly string[], cannot: string, notDone: string) {
  const reasons = [...new Set(rejected)];
  const listed = reasons.slice(0, 5).join(" / ");
  const rest = reasons.length > 5 ? ` 他${reasons.length - 5}件` : "";
  return new JournalReviewError(
    `${cannot}仕訳があるため、まとめて${notDone}: ${listed}${rest}。画面を再読み込みしてください`,
  );
}
