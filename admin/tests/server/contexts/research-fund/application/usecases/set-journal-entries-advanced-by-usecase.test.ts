import { SetJournalEntriesAdvancedByUsecase } from "@/server/contexts/research-fund/application/usecases/set-journal-entries-advanced-by-usecase";
import type { ReviewEntry } from "@/server/contexts/research-fund/domain/models/journal-review";
import { entry, grant, setup, target } from "./journal-review-test-helpers";
function setupUsecase(overrides: Partial<ReviewEntry> = {}) {
  const { repository, cacheInvalidator } = setup(overrides);
  return { repository, cacheInvalidator, usecase: new SetJournalEntriesAdvancedByUsecase(repository) };
}
test.each(["draft", "approved", "published"] as const)("%s の支出に立替者を設定できる（公開中も変更でき、キャッシュは無効化しない）", async status => {
  const { repository, cacheInvalidator, usecase } = setupUsecase({ status });
  await expect(usecase.execute("1", [target], " 秘書A ")).resolves.toEqual({ updated: 1, advancedBy: "秘書A" });
  expect(repository.setAdvancedBy).toHaveBeenCalledWith("1", [{ ...entry, status }], "秘書A");
  expect(cacheInvalidator.invalidateWebappCache).not.toHaveBeenCalled();
});
test("空白だけの立替者は立替の解除として保存する", async () => {
  const { repository, usecase } = setupUsecase();
  await expect(usecase.execute("1", [target], "　")).resolves.toEqual({ updated: 1, advancedBy: null });
  expect(repository.setAdvancedBy).toHaveBeenCalledWith("1", [entry], null);
});
test("長すぎる立替者は保存しない", async () => {
  const { repository, usecase } = setupUsecase();
  await expect(usecase.execute("1", [target], "あ".repeat(256))).rejects.toThrow("255文字以内");
  expect(repository.findMany).not.toHaveBeenCalled(); expect(repository.setAdvancedBy).not.toHaveBeenCalled();
});
test("同じ仕訳を重ねて選んでも1件として扱う", async () => {
  const { usecase } = setupUsecase();
  await expect(usecase.execute("1", [target, target], "秘書A")).resolves.toEqual({ updated: 1, advancedBy: "秘書A" });
});
test.each([
  [{ settledAt: "2026-09-01", advancedBy: "秘書A" }, "精算済"],
  [{ updatedAt: "2026-09-01T00:00:00.000Z" }, "別の操作で更新されました"],
])("精算済・同時更新の仕訳が混ざっていたら立替者を1件も変更しない %j", async (overrides, message) => {
  const { repository, usecase } = setupUsecase(overrides);
  await expect(usecase.execute("1", [target], "秘書A")).rejects.toThrow(message);
  expect(repository.setAdvancedBy).not.toHaveBeenCalled();
});
test("支給・返還など findMany が返さない仕訳には立替者を設定できない", async () => {
  const { repository, usecase } = setupUsecase();
  repository.findMany.mockResolvedValue([]);
  await expect(usecase.execute("1", [target], "秘書A")).rejects.toThrow("支給・返還");
  expect(repository.setAdvancedBy).not.toHaveBeenCalled();
});
test("取得した仕訳に支給が含まれていても1件の操作と同じ判定で拒否する", async () => {
  const { repository, usecase } = setupUsecase({ ...grant, settledAt: null, advancedBy: null });
  await expect(usecase.execute("1", [target], "秘書A")).rejects.toThrow("支給・返還");
  expect(repository.setAdvancedBy).not.toHaveBeenCalled();
});
