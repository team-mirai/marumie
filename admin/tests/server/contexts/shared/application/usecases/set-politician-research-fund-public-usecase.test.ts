import { SetPoliticianResearchFundPublicUsecase } from "@/server/contexts/shared/application/usecases/set-politician-research-fund-public-usecase";
import type { IPoliticianRepository } from "@/server/contexts/shared/domain/repositories/politician-repository.interface";
import type { ICacheInvalidator } from "@/server/contexts/shared/domain/services/cache-invalidator.interface";

const politician = {
  id: "1",
  name: "議員名",
  slug: "test-member",
  termStart: "2026-02-08",
  politicalOrganizationId: "",
  politicalOrganizationName: null,
  isResearchFundPublic: false,
};
let repository: jest.Mocked<IPoliticianRepository>;
let cacheInvalidator: jest.Mocked<ICacheInvalidator>;
let usecase: SetPoliticianResearchFundPublicUsecase;
beforeEach(() => {
  repository = {
    findAll: jest.fn(),
    findById: jest.fn().mockResolvedValue(politician),
    save: jest.fn(),
    setResearchFundPublic: jest.fn(),
    delete: jest.fn(),
  };
  cacheInvalidator = { invalidateWebappCache: jest.fn().mockResolvedValue(undefined) };
  usecase = new SetPoliticianResearchFundPublicUsecase(repository, cacheInvalidator);
});
test.each([true, false])("公開フラグを %s に切り替え、webapp のキャッシュを消す", async (isPublic) => {
  await expect(usecase.execute("1", isPublic)).resolves.toEqual({ cacheWarning: null });
  expect(repository.setResearchFundPublic).toHaveBeenCalledWith("1", isPublic);
  expect(cacheInvalidator.invalidateWebappCache).toHaveBeenCalledTimes(1);
  expect(repository.setResearchFundPublic.mock.invocationCallOrder[0]).toBeLessThan(
    cacheInvalidator.invalidateWebappCache.mock.invocationCallOrder[0],
  );
});
test("キャッシュの無効化に失敗しても切り替えは成功にし、警告を返す", async () => {
  cacheInvalidator.invalidateWebappCache.mockRejectedValue(new Error("接続に失敗しました"));
  await expect(usecase.execute("1", true)).resolves.toEqual({
    cacheWarning: "接続に失敗しました",
  });
  expect(repository.setResearchFundPublic).toHaveBeenCalledWith("1", true);
});
test("存在しない議員や不正な ID は切り替えない", async () => {
  repository.findById.mockResolvedValue(null);
  await expect(usecase.execute("1", true)).rejects.toThrow("議員が見つかりません");
  await expect(usecase.execute("abc", true)).rejects.toThrow("議員が見つかりません");
  expect(repository.setResearchFundPublic).not.toHaveBeenCalled();
  expect(cacheInvalidator.invalidateWebappCache).not.toHaveBeenCalled();
});
test("真偽値以外は受け付けない", async () => {
  await expect(usecase.execute("1", "true" as unknown as boolean)).rejects.toThrow(
    "公開するかを選択してください",
  );
  expect(repository.setResearchFundPublic).not.toHaveBeenCalled();
});
