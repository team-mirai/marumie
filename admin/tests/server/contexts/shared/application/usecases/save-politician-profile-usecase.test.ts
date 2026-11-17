import { SavePoliticianProfileUsecase } from "@/server/contexts/shared/application/usecases/save-politician-profile-usecase";
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
let usecase: SavePoliticianProfileUsecase;
beforeEach(() => {
  repository = {
    findAll: jest.fn(),
    findById: jest.fn().mockResolvedValue(current),
    save: jest.fn(),
    setResearchFundPublic: jest.fn(),
    setPhotoPath: jest.fn(),
    delete: jest.fn(),
  };
  usecase = new SavePoliticianProfileUsecase(repository);
});

test("プロフィールを正規化して保存し、氏名・スラッグ・当選日・所属は保存済みの値を残す", async () => {
  await usecase.execute("1", profile);
  expect(repository.save).toHaveBeenCalledWith("1", {
    name: "議員名",
    slug: "test-member",
    termStart: "2026-02-08",
    politicalOrganizationId: "2",
    nameKana: "ぎいんめい",
    house: "shugiin",
    constituency: "東京7区",
    profileUrl: "https://team-mir.ai/member/test",
    websiteUrl: "",
    snsUrls: ["https://x.com/test"],
  });
});

test("プロフィール以外の項目が入力に含まれていても無視する", async () => {
  await usecase.execute("1", {
    ...profile,
    name: "別の名前",
    slug: "other",
    politicalOrganizationId: "",
  } as PoliticianProfileInput);
  expect(repository.save).toHaveBeenCalledWith(
    "1",
    expect.objectContaining({ name: "議員名", slug: "test-member", politicalOrganizationId: "2" }),
  );
});

test.each([
  { profileUrl: "javascript:alert(1)" },
  { house: "invalid" },
  { snsUrls: "https://x.com/test" },
])("不正なプロフィールは保存しない: %j", async (invalid) => {
  await expect(
    usecase.execute("1", { ...profile, ...invalid } as unknown as PoliticianProfileInput),
  ).rejects.toThrow();
  expect(repository.save).not.toHaveBeenCalled();
});

test("存在しない議員・不正な ID は保存しない", async () => {
  repository.findById.mockResolvedValue(null);
  await expect(usecase.execute("1", profile)).rejects.toThrow("議員が見つかりません");
  await expect(usecase.execute("abc", profile)).rejects.toThrow("議員が見つかりません");
  expect(repository.save).not.toHaveBeenCalled();
});
