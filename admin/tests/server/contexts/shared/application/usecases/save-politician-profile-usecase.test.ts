import { SavePoliticianProfileUsecase } from "@/server/contexts/shared/application/usecases/save-politician-profile-usecase";
import type { ICacheInvalidator } from "@/server/contexts/shared/domain/services/cache-invalidator.interface";
import type { IPoliticianRepository } from "@/server/contexts/shared/domain/repositories/politician-repository.interface";
import type { Politician, PoliticianProfileInput } from "@/shared/models/politician";

const current: Politician = {
  id: "1",
  name: "議員名",
  slug: "test-member",
  termStart: "2026-02-08",
  politicalOrganizationId: "2",
  politicalOrganizationName: "チームみらい",
  isResearchFundPublic: true,
  nameKana: "",
  house: "",
  constituency: "",
  profileUrl: "",
  websiteUrl: "",
  snsUrls: [],
  photoPath: null,
};
const profile: PoliticianProfileInput = {
  nameKana: " ぎいんめい ",
  house: "shugiin",
  constituency: "東京7区",
  profileUrl: "https://team-mir.ai/member/test",
  websiteUrl: "",
  snsUrls: ["https://x.com/test", " "],
};
let repository: jest.Mocked<IPoliticianRepository>;
let cacheInvalidator: jest.Mocked<ICacheInvalidator>;
let usecase: SavePoliticianProfileUsecase;
beforeEach(() => {
  repository = {
    findAll: jest.fn(),
    findById: jest.fn().mockResolvedValue(current),
    save: jest.fn(),
    saveProfile: jest.fn(),
    setResearchFundPublic: jest.fn(),
    setPhotoPath: jest.fn(),
    delete: jest.fn(),
  };
  cacheInvalidator = { invalidateWebappCache: jest.fn().mockResolvedValue(undefined) };
  usecase = new SavePoliticianProfileUsecase(repository, cacheInvalidator);
});

test("プロフィールを正規化し、プロフィールの列だけを保存する", async () => {
  await usecase.execute("1", profile);
  expect(repository.save).not.toHaveBeenCalled();
  expect(repository.saveProfile).toHaveBeenCalledWith("1", {
    nameKana: "ぎいんめい",
    house: "shugiin",
    constituency: "東京7区",
    profileUrl: "https://team-mir.ai/member/test",
    websiteUrl: "",
    snsUrls: ["https://x.com/test"],
  });
  expect(cacheInvalidator.invalidateWebappCache).toHaveBeenCalledTimes(1);
});

test("webapp のキャッシュを消せなくても保存は成功にし、警告を返す", async () => {
  cacheInvalidator.invalidateWebappCache.mockRejectedValue(new Error("webapp down"));
  await expect(usecase.execute("1", profile)).resolves.toEqual({ cacheWarning: "webapp down" });
  expect(repository.saveProfile).toHaveBeenCalled();
});

test("プロフィール以外の項目が入力に含まれていても無視する", async () => {
  await usecase.execute("1", {
    ...profile,
    name: "別の名前",
    slug: "other",
    politicalOrganizationId: "",
  } as PoliticianProfileInput);
  const saved = repository.saveProfile.mock.calls[0][1];
  expect(saved).not.toHaveProperty("name");
  expect(saved).not.toHaveProperty("slug");
  expect(saved).not.toHaveProperty("politicalOrganizationId");
  expect(repository.save).not.toHaveBeenCalled();
});

test.each([
  { profileUrl: "javascript:alert(1)" },
  { house: "invalid" },
  { snsUrls: "https://x.com/test" },
])("不正なプロフィールは保存しない: %j", async (invalid) => {
  await expect(
    usecase.execute("1", { ...profile, ...invalid } as unknown as PoliticianProfileInput),
  ).rejects.toThrow();
  expect(repository.saveProfile).not.toHaveBeenCalled();
  expect(cacheInvalidator.invalidateWebappCache).not.toHaveBeenCalled();
});

test("存在しない議員・不正な ID は保存しない", async () => {
  repository.findById.mockResolvedValue(null);
  await expect(usecase.execute("1", profile)).rejects.toThrow("議員が見つかりません");
  await expect(usecase.execute("abc", profile)).rejects.toThrow("議員が見つかりません");
  expect(repository.saveProfile).not.toHaveBeenCalled();
});
