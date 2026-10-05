import { revalidatePath } from "next/cache";
import { requireAuth } from "@/server/contexts/auth/presentation/loaders/require-auth";
import { requireJournalTarget } from "@/server/contexts/research-fund/presentation/loaders/load-journal-review";
import { ApproveJournalEntriesUsecase } from "@/server/contexts/research-fund/application/usecases/approve-journal-entries-usecase";
import { CreateJournalEntryUsecase } from "@/server/contexts/research-fund/application/usecases/create-journal-entry-usecase";
import { DiscardJournalEntriesUsecase } from "@/server/contexts/research-fund/application/usecases/discard-journal-entries-usecase";
import { DiscardJournalEntryUsecase } from "@/server/contexts/research-fund/application/usecases/discard-journal-entry-usecase";
import { RevertJournalEntriesToDraftUsecase } from "@/server/contexts/research-fund/application/usecases/revert-journal-entries-to-draft-usecase";
import { RevertJournalEntryToDraftUsecase } from "@/server/contexts/research-fund/application/usecases/revert-journal-entry-to-draft-usecase";
import { SaveJournalEntryUsecase } from "@/server/contexts/research-fund/application/usecases/save-journal-entry-usecase";
import { SetJournalEntriesAdvancedByUsecase } from "@/server/contexts/research-fund/application/usecases/set-journal-entries-advanced-by-usecase";
import { SettleJournalEntriesUsecase } from "@/server/contexts/research-fund/application/usecases/settle-journal-entries-usecase";
import { UnpublishJournalEntryUsecase } from "@/server/contexts/research-fund/application/usecases/unpublish-journal-entry-usecase";
import { UnsettleJournalEntriesUsecase } from "@/server/contexts/research-fund/application/usecases/unsettle-journal-entries-usecase";
import { mutateJournalReview } from "@/server/contexts/research-fund/presentation/actions/manage-journal-review";
import { JournalReviewError, type JournalEdit } from "@/server/contexts/research-fund/domain/models/journal-review";
jest.mock("next/cache", () => ({ revalidatePath: jest.fn() }));
jest.mock("@/server/contexts/auth/presentation/loaders/require-auth", () => ({ requireAuth: jest.fn() }));
jest.mock("@/server/contexts/research-fund/presentation/loaders/load-journal-review", () => ({ requireJournalTarget: jest.fn() }));
jest.mock("@/server/contexts/shared/infrastructure/prisma", () => ({ prisma: {} }));
const input: JournalEdit = { entryDate: "2026-08-01", description: "移動", amount: 1200, accountKey: "taxi", note: "", memo: "" };
beforeEach(() => {
  jest.clearAllMocks();
  jest.mocked(requireAuth).mockResolvedValue({ id: "user" } as Awaited<ReturnType<typeof requireAuth>>);
  jest.mocked(requireJournalTarget).mockResolvedValue({ kind: "research-fund", key: "book:1", name: "議員", year: 2026, politicianId: "2", bookId: "1", draftCount: 0 });
});
afterEach(() => jest.restoreAllMocks());
test("現在の対象を検証し、作成者をサーバー側で設定し、レイアウトを再検証", async () => {
  const create = jest.spyOn(CreateJournalEntryUsecase.prototype, "execute").mockResolvedValue("3");
  await expect(mutateJournalReview("2", "1", { type: "create", input })).resolves.toEqual({ success: true, id: "3" });
  expect(requireJournalTarget).toHaveBeenCalledWith("2", "1"); expect(create).toHaveBeenCalledWith("1", input, "user"); expect(revalidatePath).toHaveBeenCalledWith("/(auth)", "layout");
});
test("別の対象への古いフォーム送信を拒否", async () => {
  jest.mocked(requireJournalTarget).mockResolvedValue(null);
  const create = jest.spyOn(CreateJournalEntryUsecase.prototype, "execute");
  await expect(mutateJournalReview("2", "1", { type: "create", input })).resolves.toMatchObject({ success: false });
  expect(create).not.toHaveBeenCalled(); expect(revalidatePath).not.toHaveBeenCalled();
});
test("認証失敗時は更新しない", async () => {
  jest.mocked(requireAuth).mockRejectedValueOnce(new Error("auth"));
  const create = jest.spyOn(CreateJournalEntryUsecase.prototype, "execute");
  await expect(mutateJournalReview("2", "1", { type: "create", input })).rejects.toThrow("auth");
  expect(create).not.toHaveBeenCalled(); expect(revalidatePath).not.toHaveBeenCalled();
});
test("内部エラーは漏らさず、失敗時に再検証しない", async () => {
  jest.spyOn(SaveJournalEntryUsecase.prototype, "execute").mockRejectedValue(new Error("private database detail"));
  await expect(mutateJournalReview("2", "1", { type: "save", id: "3", updatedAt: "date", input, approve: true })).resolves.toEqual({ success: false, error: "仕訳の保存に失敗しました" });
  expect(revalidatePath).not.toHaveBeenCalled();
});

test("保存と破棄は対象帳簿・更新日時を渡し、成功後に再検証する", async () => {
  const save = jest.spyOn(SaveJournalEntryUsecase.prototype, "execute").mockResolvedValue();
  const discard = jest.spyOn(DiscardJournalEntryUsecase.prototype, "execute").mockResolvedValue();
  await expect(mutateJournalReview("2", "1", { type: "save", id: "3", updatedAt: "date", input, approve: true })).resolves.toEqual({ success: true });
  expect(save).toHaveBeenCalledWith("1", "3", "date", input, true);
  await expect(mutateJournalReview("2", "1", { type: "discard", id: "3", updatedAt: "date" })).resolves.toEqual({ success: true });
  expect(discard).toHaveBeenCalledWith("1", "3", "date");
  expect(revalidatePath).toHaveBeenCalledTimes(2);
});

test("利用者が解消できる業務エラーはメッセージを返す", async () => {
  jest.spyOn(DiscardJournalEntryUsecase.prototype, "execute").mockRejectedValue(new JournalReviewError("公開中の仕訳は編集・破棄できません"));
  await expect(mutateJournalReview("2", "1", { type: "discard", id: "3", updatedAt: "date" })).resolves.toEqual({ success: false, error: "公開中の仕訳は編集・破棄できません" });
  expect(revalidatePath).not.toHaveBeenCalled();
});
test("不正な操作を拒否して再検証しない", async () => {
  await expect(mutateJournalReview("2", "1", { type: "unknown" } as never)).resolves.toEqual({ success: false, error: "操作が不正です" });
  expect(revalidatePath).not.toHaveBeenCalled();
});

test("一括の確認済は対象帳簿を検証して件数を返し、成功後に再検証する", async () => {
  const approveMany = jest.spyOn(ApproveJournalEntriesUsecase.prototype, "execute").mockResolvedValue({ approved: 2, skipped: 1 });
  const targets = [{ id: "3", updatedAt: "date" }, { id: "4", updatedAt: "date2" }];
  await expect(mutateJournalReview("2", "1", { type: "approve-many", targets })).resolves.toEqual({ success: true, approved: { approved: 2, skipped: 1 } });
  expect(approveMany).toHaveBeenCalledWith("1", targets);
  expect(revalidatePath).toHaveBeenCalledWith("/(auth)", "layout");
});
test("一括の確認済が拒否されたら理由を返し、再検証しない", async () => {
  jest.spyOn(ApproveJournalEntriesUsecase.prototype, "execute").mockRejectedValue(new JournalReviewError("「移動」は科目が未確定です"));
  await expect(mutateJournalReview("2", "1", { type: "approve-many", targets: [{ id: "3", updatedAt: "date" }] })).resolves.toEqual({ success: false, error: "「移動」は科目が未確定です" });
  expect(revalidatePath).not.toHaveBeenCalled();
});

test("一括の破棄は対象帳簿を検証して件数を返し、成功後に再検証する", async () => {
  const discardMany = jest.spyOn(DiscardJournalEntriesUsecase.prototype, "execute").mockResolvedValue({ discarded: 2 });
  const targets = [{ id: "3", updatedAt: "date" }, { id: "4", updatedAt: "date2" }];
  await expect(mutateJournalReview("2", "1", { type: "discard-many", targets })).resolves.toEqual({ success: true, discarded: 2 });
  expect(discardMany).toHaveBeenCalledWith("1", targets);
  expect(revalidatePath).toHaveBeenCalledWith("/(auth)", "layout");
});
test("一括の破棄が拒否されたら理由を返し、再検証しない", async () => {
  jest.spyOn(DiscardJournalEntriesUsecase.prototype, "execute").mockRejectedValue(new JournalReviewError("「移動」は公開中です"));
  await expect(mutateJournalReview("2", "1", { type: "discard-many", targets: [{ id: "3", updatedAt: "date" }] })).resolves.toEqual({ success: false, error: "「移動」は公開中です" });
  expect(revalidatePath).not.toHaveBeenCalled();
});
test("一括で下書きに戻すと件数を返して再検証する", async () => {
  const revertManyToDraft = jest.spyOn(RevertJournalEntriesToDraftUsecase.prototype, "execute").mockResolvedValue({ reverted: 2 });
  const targets = [{ id: "3", updatedAt: "date" }, { id: "4", updatedAt: "date" }];
  await expect(mutateJournalReview("2", "1", { type: "revert-many-to-draft", targets })).resolves.toEqual({ success: true, reverted: 2 });
  expect(revertManyToDraft).toHaveBeenCalledWith("1", targets);
  expect(revalidatePath).toHaveBeenCalledWith("/(auth)", "layout");
});
test("一括で下書きに戻すのが拒否されたら理由を返し、再検証しない", async () => {
  jest.spyOn(RevertJournalEntriesToDraftUsecase.prototype, "execute").mockRejectedValue(new JournalReviewError("「移動」は確認済ではありません"));
  await expect(mutateJournalReview("2", "1", { type: "revert-many-to-draft", targets: [{ id: "3", updatedAt: "date" }] })).resolves.toEqual({ success: false, error: "「移動」は確認済ではありません" });
  expect(revalidatePath).not.toHaveBeenCalled();
});

test("取り下げは対象帳簿・更新日時を渡し、キャッシュの警告をそのまま返す", async () => {
  const unpublish = jest.spyOn(UnpublishJournalEntryUsecase.prototype, "execute").mockResolvedValue({ cacheWarning: "接続に失敗しました" });
  await expect(mutateJournalReview("2", "1", { type: "unpublish", id: "3", updatedAt: "date" })).resolves.toEqual({ success: true, cacheWarning: "接続に失敗しました" });
  expect(unpublish).toHaveBeenCalledWith("1", "3", "date");
  expect(revalidatePath).toHaveBeenCalledWith("/(auth)", "layout");
});
test("取り下げが拒否されたら理由を返し、再検証しない", async () => {
  jest.spyOn(UnpublishJournalEntryUsecase.prototype, "execute").mockRejectedValue(new JournalReviewError("公開中の仕訳だけを確認済に戻せます"));
  await expect(mutateJournalReview("2", "1", { type: "unpublish", id: "3", updatedAt: "date" })).resolves.toEqual({ success: false, error: "公開中の仕訳だけを確認済に戻せます" });
  expect(revalidatePath).not.toHaveBeenCalled();
});

test("下書きに戻す操作は対象帳簿・更新日時を渡し、成功後に再検証する", async () => {
  const revertToDraft = jest.spyOn(RevertJournalEntryToDraftUsecase.prototype, "execute").mockResolvedValue();
  await expect(mutateJournalReview("2", "1", { type: "revert-to-draft", id: "3", updatedAt: "date" })).resolves.toEqual({ success: true });
  expect(revertToDraft).toHaveBeenCalledWith("1", "3", "date");
  expect(revalidatePath).toHaveBeenCalledWith("/(auth)", "layout");
});
test("下書きに戻す操作が拒否されたら理由を返し、再検証しない", async () => {
  jest.spyOn(RevertJournalEntryToDraftUsecase.prototype, "execute").mockRejectedValue(new JournalReviewError("支給は下書きに戻せません"));
  await expect(mutateJournalReview("2", "1", { type: "revert-to-draft", id: "3", updatedAt: "date" })).resolves.toEqual({ success: false, error: "支給は下書きに戻せません" });
  expect(revalidatePath).not.toHaveBeenCalled();
});

test("立替者の一括設定は対象帳簿を検証して結果を返し、成功後に再検証する", async () => {
  const setAdvancedBy = jest.spyOn(SetJournalEntriesAdvancedByUsecase.prototype, "execute").mockResolvedValue({ updated: 2, advancedBy: "秘書A" });
  const targets = [{ id: "3", updatedAt: "date" }, { id: "4", updatedAt: "date2" }];
  await expect(mutateJournalReview("2", "1", { type: "set-advanced-by", targets, advancedBy: "秘書A" })).resolves.toEqual({ success: true, advance: { updated: 2, advancedBy: "秘書A" } });
  expect(setAdvancedBy).toHaveBeenCalledWith("1", targets, "秘書A");
  expect(revalidatePath).toHaveBeenCalledWith("/(auth)", "layout");
});
test("一括精算は精算日を渡して結果を返し、成功後に再検証する", async () => {
  const settleMany = jest.spyOn(SettleJournalEntriesUsecase.prototype, "execute").mockResolvedValue({ settled: 2, settledAt: "2026-09-30" });
  const targets = [{ id: "3", updatedAt: "date" }, { id: "4", updatedAt: "date2" }];
  await expect(mutateJournalReview("2", "1", { type: "settle-many", targets, settledAt: "2026-09-30" })).resolves.toEqual({ success: true, settlement: { settled: 2, settledAt: "2026-09-30" } });
  expect(settleMany).toHaveBeenCalledWith("1", targets, "2026-09-30");
  expect(revalidatePath).toHaveBeenCalledWith("/(auth)", "layout");
});
test("一括で未精算に戻すと件数を返して再検証する", async () => {
  const unsettleMany = jest.spyOn(UnsettleJournalEntriesUsecase.prototype, "execute").mockResolvedValue({ unsettled: 2 });
  const targets = [{ id: "3", updatedAt: "date" }];
  await expect(mutateJournalReview("2", "1", { type: "unsettle-many", targets })).resolves.toEqual({ success: true, unsettled: 2 });
  expect(unsettleMany).toHaveBeenCalledWith("1", targets);
  expect(revalidatePath).toHaveBeenCalledWith("/(auth)", "layout");
});
test.each([
  ["set-advanced-by", SetJournalEntriesAdvancedByUsecase, "精算済です（先に未精算に戻してください）"],
  ["settle-many", SettleJournalEntriesUsecase, "下書きです"],
  ["unsettle-many", UnsettleJournalEntriesUsecase, "未精算です"],
] as const)("%s が拒否されたら理由を返し、再検証しない", async (type, usecase, message) => {
  jest.spyOn(usecase.prototype, "execute").mockRejectedValue(new JournalReviewError(message));
  await expect(mutateJournalReview("2", "1", { type, targets: [{ id: "3", updatedAt: "date" }], advancedBy: "秘書A", settledAt: "2026-09-30" } as never)).resolves.toEqual({ success: false, error: message });
  expect(revalidatePath).not.toHaveBeenCalled();
});
