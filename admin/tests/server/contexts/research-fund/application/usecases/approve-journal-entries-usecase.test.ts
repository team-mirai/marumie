import { ApproveJournalEntriesUsecase } from "@/server/contexts/research-fund/application/usecases/approve-journal-entries-usecase";
import type { ReviewEntry } from "@/server/contexts/research-fund/domain/models/journal-review";
import { entry, grant, setup, target } from "./journal-review-test-helpers";
function setupUsecase(overrides: Partial<ReviewEntry> = {}) {
  const { repository } = setup(overrides);
  return { repository, usecase: new ApproveJournalEntriesUsecase(repository) };
}
test("選んだ下書きをまとめて確認済にし、重複した指定は1件に畳む", async () => {
  const { repository, usecase } = setupUsecase();
  await expect(usecase.execute("1", [target, target])).resolves.toEqual({ approved: 1, skipped: 0 });
  expect(repository.findMany).toHaveBeenCalledWith("1", [entry.id]);
  expect(repository.approveMany).toHaveBeenCalledWith("1", [entry]);
});
test.each([
  [{ status: "published" as const }, "公開中"],
  [{ status: "approved" as const }, "下書きではありません"],
  [{ status: "approved" as const, accountKey: "needs-review" }, "下書きではありません"],
  [{ accountKey: "needs-review", updatedAt: "2026-09-01T00:00:00.000Z" }, "別の操作で更新されました"],
  [{ updatedAt: "2026-09-01T00:00:00.000Z" }, "別の操作で更新されました"],
])("確認済にできない仕訳が混ざっていたら理由を示して1件も変更しない %j", async (overrides, message) => {
  const { repository, usecase } = setupUsecase(overrides);
  await expect(usecase.execute("1", [target])).rejects.toThrow(message);
  expect(repository.approveMany).not.toHaveBeenCalled();
});
test("支給・別帳簿など取得できない仕訳は黙って除外せず、まとめて拒否する", async () => {
  const { repository, usecase } = setupUsecase(); repository.findMany.mockResolvedValue([]);
  await expect(usecase.execute("1", [target])).rejects.toThrow("この画面で扱えない仕訳");
  expect(repository.approveMany).not.toHaveBeenCalled();
});
test("処理できる仕訳があっても、要確認以外の理由でできない仕訳が1件でもあれば全体を中止する", async () => {
  const { repository, usecase } = setupUsecase();
  repository.findMany.mockResolvedValue([entry, { ...entry, id: "3", description: "公開中の支出", status: "published" }, { ...entry, id: "4", accountKey: "needs-review" }]);
  await expect(usecase.execute("1", [target, { id: "3", updatedAt: entry.updatedAt }, { id: "4", updatedAt: entry.updatedAt }])).rejects.toThrow("「公開中の支出」は公開中です");
  expect(repository.approveMany).not.toHaveBeenCalled();
});
test("科目が要確認の下書きは除外し、残りを確認済にして除外件数を返す", async () => {
  const { repository, usecase } = setupUsecase();
  const needsReview = { ...entry, id: "3", description: "要確認の支出", accountKey: "needs-review" };
  repository.findMany.mockResolvedValue([entry, needsReview]);
  await expect(usecase.execute("1", [target, { id: "3", updatedAt: entry.updatedAt }])).resolves.toEqual({ approved: 1, skipped: 1 });
  expect(repository.approveMany).toHaveBeenCalledWith("1", [entry]);
});
test("選んだ下書きがすべて要確認なら何も変更せず、確認済にできる仕訳がないと伝える", async () => {
  const { repository, usecase } = setupUsecase({ accountKey: "needs-review" });
  await expect(usecase.execute("1", [target])).rejects.toThrow("確認済にできる仕訳がありません");
  expect(repository.approveMany).not.toHaveBeenCalled();
});
test.each([[[]], [[{ id: "0", updatedAt: entry.updatedAt }]], [[{ id: "a", updatedAt: entry.updatedAt }]]])("選択なし・不正なIDは取得もしない %j", async targets => {
  const { repository, usecase } = setupUsecase();
  await expect(usecase.execute("1", targets)).rejects.toThrow();
  expect(repository.findMany).not.toHaveBeenCalled(); expect(repository.approveMany).not.toHaveBeenCalled();
});
test("まとめて確認済にするのは、確認済が1件でも混ざっていれば下書きも変更しない", async () => {
  const { repository, usecase } = setupUsecase();
  repository.findMany.mockResolvedValue([entry, { ...entry, id: "3", description: "確認済の支出", status: "approved" }]);
  await expect(usecase.execute("1", [target, { id: "3", updatedAt: entry.updatedAt }])).rejects.toThrow("「確認済の支出」は下書きではありません");
  expect(repository.approveMany).not.toHaveBeenCalled();
});
test("取得した仕訳に支給が含まれていても1件の操作と同じ判定で拒否する", async () => {
  const { repository, usecase } = setupUsecase({ ...grant, settledAt: null, advancedBy: null });
  await expect(usecase.execute("1", [target])).rejects.toThrow("この画面で扱えない仕訳");
  expect(repository.approveMany).not.toHaveBeenCalled();
});
