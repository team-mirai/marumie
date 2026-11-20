import { SetPoliticianResearchFundComingSoonUsecase } from "@/server/contexts/shared/application/usecases/set-politician-research-fund-coming-soon-usecase";
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
  researchFundComingSoonNote: null,
};
let repository: jest.Mocked<IPoliticianRepository>;
let cacheInvalidator: jest.Mocked<ICacheInvalidator>;
let usecase: SetPoliticianResearchFundComingSoonUsecase;
beforeEach(() => {
  repository = {
    findAll: jest.fn(),
    findById: jest.fn().mockResolvedValue(politician),
    save: jest.fn(),
    saveProfile: jest.fn(),
    setResearchFundPublic: jest.fn(),
    setResearchFundComingSoonNote: jest.fn(),
    setPhotoPath: jest.fn(),
    delete: jest.fn(),
  };
  cacheInvalidator = { invalidateWebappCache: jest.fn().mockResolvedValue(undefined) };
  usecase = new SetPoliticianResearchFundComingSoonUsecase(repository, cacheInvalidator);
});
test("添え書きの前後の空白を除いて保存し、webapp のキャッシュを消す", async () => {
  await expect(usecase.execute("1", "  12月中旬を目処に公開予定です。 ")).resolves.toEqual({
    cacheWarning: null,
  });
  expect(repository.setResearchFundComingSoonNote).toHaveBeenCalledWith(
    "1",
    "12月中旬を目処に公開予定です。",
  );
  expect(cacheInvalidator.invalidateWebappCache).toHaveBeenCalledTimes(1);
});
test("null なら準備中の表示をやめ、空文字なら添え書きなしで出す", async () => {
  await usecase.execute("1", null);
  await usecase.execute("1", "   ");
  expect(repository.setResearchFundComingSoonNote).toHaveBeenNthCalledWith(1, "1", null);
  expect(repository.setResearchFundComingSoonNote).toHaveBeenNthCalledWith(2, "1", "");
});
test("長すぎる添え書き・存在しない議員は保存しない", async () => {
  await expect(usecase.execute("1", "あ".repeat(201))).rejects.toThrow("200文字以内");
  repository.findById.mockResolvedValue(null);
  await expect(usecase.execute("1", "x")).rejects.toThrow("議員が見つかりません");
  await expect(usecase.execute("abc", "x")).rejects.toThrow("議員が見つかりません");
  expect(repository.setResearchFundComingSoonNote).not.toHaveBeenCalled();
  expect(cacheInvalidator.invalidateWebappCache).not.toHaveBeenCalled();
});
