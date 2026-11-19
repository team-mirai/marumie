import { SettleJournalEntriesUsecase } from "@/server/contexts/research-fund/application/usecases/settle-journal-entries-usecase";
import type { ReviewEntry } from "@/server/contexts/research-fund/domain/models/journal-review";
import { advanced, entry, grant, settled, setup, target } from "./journal-review-test-helpers";
function setupUsecase(overrides: Partial<ReviewEntry> = {}) {
  const { repository, cacheInvalidator } = setup(overrides);
  return { repository, cacheInvalidator, usecase: new SettleJournalEntriesUsecase(repository) };
}
test.each(["approved", "published"] as const)("%s の未精算の立替をまとめて精算できる（キャッシュは無効化しない）", async status => {
  const { repository, cacheInvalidator, usecase } = setupUsecase({ ...advanced, status });
  await expect(usecase.execute("1", [target], "2026-09-30")).resolves.toEqual({ settled: 1, settledAt: "2026-09-30" });
  expect(repository.settleMany).toHaveBeenCalledWith("1", [{ ...advanced, status }], "2026-09-30");
  expect(cacheInvalidator.invalidateWebappCache).not.toHaveBeenCalled();
});
test.each([
  [{ ...entry, status: "draft" as const, advancedBy: "秘書A" }, "下書き"],
  [{ ...entry, status: "approved" as const }, "立替ではありません"],
  [settled, "すでに精算済"],
])("下書き・立替なし・精算済が選ばれていたら1件も精算しない %j", async (overrides, message) => {
  const { repository, usecase } = setupUsecase(overrides);
  await expect(usecase.execute("1", [target], "2026-09-30")).rejects.toThrow(message);
  await expect(usecase.execute("1", [target], "2026-09-30")).rejects.toThrow("まとめて精算しませんでした");
  expect(repository.settleMany).not.toHaveBeenCalled();
});
test.each(["2099-12-31", "2026-07-31"])("未来日・仕訳の日付より前の精算日は受け付けない %s", async settledAt => {
  const { repository, usecase } = setupUsecase(advanced);
  await expect(usecase.execute("1", [target], settledAt)).rejects.toThrow();
  expect(repository.settleMany).not.toHaveBeenCalled();
});
test("取得した仕訳に支給が含まれていても1件の操作と同じ判定で拒否する", async () => {
  const { repository, usecase } = setupUsecase({ ...grant, settledAt: null, advancedBy: null });
  await expect(usecase.execute("1", [target], "2026-09-30")).rejects.toThrow("支給・返還");
  expect(repository.settleMany).not.toHaveBeenCalled();
});
