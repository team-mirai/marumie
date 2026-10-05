import { UnpublishJournalEntryUsecase } from "@/server/contexts/research-fund/application/usecases/unpublish-journal-entry-usecase";
import type { ReviewEntry } from "@/server/contexts/research-fund/domain/models/journal-review";
import { entry, grant, setup } from "./journal-review-test-helpers";
function setupUsecase(overrides: Partial<ReviewEntry> = {}) {
  const { repository, cacheInvalidator } = setup(overrides);
  return { repository, cacheInvalidator, usecase: new UnpublishJournalEntryUsecase(repository, cacheInvalidator) };
}
test("公開中の仕訳を確認済に戻し、webappのキャッシュを無効化する", async () => {
  const { repository, cacheInvalidator, usecase } = setupUsecase({ status: "published" });
  await expect(usecase.execute("1", "2", entry.updatedAt)).resolves.toEqual({ cacheWarning: null });
  expect(repository.unpublish).toHaveBeenCalledWith("1", { ...entry, status: "published" });
  expect(cacheInvalidator.invalidateWebappCache).toHaveBeenCalledTimes(1);
});
test("公開中の支給も確認済に戻し、webappのキャッシュを無効化する", async () => {
  const { repository, cacheInvalidator, usecase } = setupUsecase({ ...grant, status: "published" });
  await expect(usecase.execute("1", "2", entry.updatedAt)).resolves.toEqual({ cacheWarning: null });
  expect(repository.unpublish).toHaveBeenCalledWith("1", expect.objectContaining({ source: "grant", status: "published" }));
  expect(cacheInvalidator.invalidateWebappCache).toHaveBeenCalledTimes(1);
});
test.each([
  [{ status: "draft" as const }, "公開中の仕訳だけを確認済に戻せます"],
  [{ status: "approved" as const }, "公開中の仕訳だけを確認済に戻せます"],
  [{ status: "published" as const, updatedAt: "2026-09-01T00:00:00.000Z" }, "別の操作で更新されました"],
])("戻せない仕訳は状態を変えずキャッシュにも触らない %j", async (overrides, message) => {
  const { repository, cacheInvalidator, usecase } = setupUsecase(overrides);
  await expect(usecase.execute("1", "2", entry.updatedAt)).rejects.toThrow(message);
  expect(repository.unpublish).not.toHaveBeenCalled();
  expect(cacheInvalidator.invalidateWebappCache).not.toHaveBeenCalled();
});
test("存在しない仕訳は戻せない", async () => {
  const { repository, usecase } = setupUsecase(); repository.find.mockResolvedValue(null);
  await expect(usecase.execute("1", "2", entry.updatedAt)).rejects.toThrow("見つかりません");
  expect(repository.unpublish).not.toHaveBeenCalled();
});
test("取り下げは確定済みなので、キャッシュ無効化の失敗は警告として返す", async () => {
  const { cacheInvalidator, usecase } = setupUsecase({ status: "published" });
  cacheInvalidator.invalidateWebappCache.mockRejectedValue(new Error("接続に失敗しました"));
  await expect(usecase.execute("1", "2", entry.updatedAt)).resolves.toEqual({ cacheWarning: "接続に失敗しました" });
});
