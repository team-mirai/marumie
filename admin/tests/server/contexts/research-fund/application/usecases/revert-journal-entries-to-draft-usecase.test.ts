import { RevertJournalEntriesToDraftUsecase } from "@/server/contexts/research-fund/application/usecases/revert-journal-entries-to-draft-usecase";
import type { ReviewEntry } from "@/server/contexts/research-fund/domain/models/journal-review";
import { entry, grant, settled, setup, target } from "./journal-review-test-helpers";
function setupUsecase(overrides: Partial<ReviewEntry> = {}) {
  const { repository, cacheInvalidator } = setup(overrides);
  return { repository, cacheInvalidator, usecase: new RevertJournalEntriesToDraftUsecase(repository) };
}
test("選んだ確認済をまとめて下書きに戻し、重複した指定は1件に畳んで件数を返す", async () => {
  const { repository, cacheInvalidator, usecase } = setupUsecase({ status: "approved" });
  await expect(usecase.execute("1", [target, target])).resolves.toEqual({ reverted: 1 });
  expect(repository.findMany).toHaveBeenCalledWith("1", [entry.id]);
  expect(repository.revertManyToDraft).toHaveBeenCalledWith("1", [{ ...entry, status: "approved" }]);
  expect(cacheInvalidator.invalidateWebappCache).not.toHaveBeenCalled();
});
test.each([
  [{ status: "draft" as const }, "確認済ではありません"],
  [{ status: "published" as const }, "公開中"],
  [{ status: "approved" as const, updatedAt: "2026-09-01T00:00:00.000Z" }, "別の操作で更新されました"],
])("下書きに戻せない仕訳が混ざっていたら理由と再読み込みを示して1件も変更しない %j", async (overrides, message) => {
  const { repository, usecase } = setupUsecase(overrides);
  await expect(usecase.execute("1", [target])).rejects.toThrow(message);
  await expect(usecase.execute("1", [target])).rejects.toThrow("まとめて下書きに戻しませんでした");
  await expect(usecase.execute("1", [target])).rejects.toThrow("再読み込み");
  expect(repository.revertManyToDraft).not.toHaveBeenCalled();
});
test("まとめて下書きに戻すのは、下書きが1件でも混ざっていれば確認済も変更しない", async () => {
  const { repository, usecase } = setupUsecase();
  repository.findMany.mockResolvedValue([{ ...entry, status: "approved" }, { ...entry, id: "3", description: "下書きの支出" }]);
  await expect(usecase.execute("1", [target, { id: "3", updatedAt: entry.updatedAt }])).rejects.toThrow("「下書きの支出」は確認済ではありません");
  expect(repository.revertManyToDraft).not.toHaveBeenCalled();
});
test("まとめて下書きに戻すのは、支給など取得できない仕訳が1件でもあれば全体を中止する", async () => {
  const { repository, usecase } = setupUsecase();
  repository.findMany.mockResolvedValue([{ ...entry, status: "approved" }]);
  await expect(usecase.execute("1", [target, { id: "3", updatedAt: entry.updatedAt }])).rejects.toThrow("この画面で扱えない仕訳");
  expect(repository.revertManyToDraft).not.toHaveBeenCalled();
});
test.each([[[]], [[{ id: "0", updatedAt: entry.updatedAt }]], [[{ id: "a", updatedAt: entry.updatedAt }]]])("まとめて下書きに戻すのは選択なし・不正なIDなら取得もしない %j", async targets => {
  const { repository, usecase } = setupUsecase();
  await expect(usecase.execute("1", targets)).rejects.toThrow();
  expect(repository.findMany).not.toHaveBeenCalled(); expect(repository.revertManyToDraft).not.toHaveBeenCalled();
});
test("精算済はまとめて下書きに戻せない（下書きは精算できないため）", async () => {
  const { repository, usecase } = setupUsecase(settled);
  await expect(usecase.execute("1", [target])).rejects.toThrow("精算済です");
  expect(repository.revertManyToDraft).not.toHaveBeenCalled();
});
test("取得した仕訳に支給が含まれていても1件の操作と同じ判定で拒否する", async () => {
  const { repository, usecase } = setupUsecase({ ...grant, settledAt: null, advancedBy: null });
  await expect(usecase.execute("1", [target])).rejects.toThrow("この画面で扱えない仕訳");
  expect(repository.revertManyToDraft).not.toHaveBeenCalled();
});
