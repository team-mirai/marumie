import { RevertJournalEntryToDraftUsecase } from "@/server/contexts/research-fund/application/usecases/revert-journal-entry-to-draft-usecase";
import type { ReviewEntry } from "@/server/contexts/research-fund/domain/models/journal-review";
import { entry, grant, settled, setup } from "./journal-review-test-helpers";
function setupUsecase(overrides: Partial<ReviewEntry> = {}) {
  const { repository, cacheInvalidator } = setup(overrides);
  return { repository, cacheInvalidator, usecase: new RevertJournalEntryToDraftUsecase(repository) };
}
test("確認済の支出の仕訳を下書きに戻し、webappのキャッシュには触らない", async () => {
  const { repository, cacheInvalidator, usecase } = setupUsecase({ status: "approved" });
  await usecase.execute("1", "2", entry.updatedAt);
  expect(repository.revertToDraft).toHaveBeenCalledWith("1", { ...entry, status: "approved" });
  expect(cacheInvalidator.invalidateWebappCache).not.toHaveBeenCalled();
});
test.each([
  [{ status: "draft" as const }, "確認済の仕訳だけを下書きに戻せます"],
  [{ status: "published" as const }, "確認済の仕訳だけを下書きに戻せます"],
  [{ ...grant, status: "approved" as const }, "支給は下書きに戻せません"],
  [{ status: "approved" as const, updatedAt: "2026-09-01T00:00:00.000Z" }, "別の操作で更新されました"],
])("下書きに戻せない仕訳は状態を変えない %j", async (overrides, message) => {
  const { repository, usecase } = setupUsecase(overrides);
  await expect(usecase.execute("1", "2", entry.updatedAt)).rejects.toThrow(message);
  expect(repository.revertToDraft).not.toHaveBeenCalled();
});
test("存在しない仕訳は下書きに戻せない", async () => {
  const { repository, usecase } = setupUsecase(); repository.find.mockResolvedValue(null);
  await expect(usecase.execute("1", "2", entry.updatedAt)).rejects.toThrow("見つかりません");
  expect(repository.revertToDraft).not.toHaveBeenCalled();
});
test("精算済は下書きに戻せない（下書きは精算できないため）", async () => {
  const { repository, usecase } = setupUsecase(settled);
  await expect(usecase.execute("1", "2", entry.updatedAt)).rejects.toThrow("精算済の仕訳は下書きに戻せません");
  expect(repository.revertToDraft).not.toHaveBeenCalled();
});
