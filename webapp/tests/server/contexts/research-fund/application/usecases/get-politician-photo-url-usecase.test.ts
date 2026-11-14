import { GetPoliticianPhotoUrlUsecase } from "@/server/contexts/research-fund/application/usecases/get-politician-photo-url-usecase";
import type { PoliticianPhotoSource } from "@/server/contexts/research-fund/domain/repositories/politician-photo-repository.interface";
import { deriveResearchFundPreviewToken } from "@/shared/research-fund/preview-token";

const SECRET = "test-secret";
const TOKEN = deriveResearchFundPreviewToken(SECRET, "sample-taro");

function build(source: PoliticianPhotoSource | null) {
  const repository = { findPhoto: jest.fn().mockResolvedValue(source) };
  const storage = { createSignedUrl: jest.fn().mockResolvedValue("https://storage.example/signed") };
  return { usecase: new GetPoliticianPhotoUrlUsecase(repository, storage), repository, storage };
}

describe("GetPoliticianPhotoUrlUsecase", () => {
  it("調研費を公開中の議員の写真は、署名URLを返す", async () => {
    const { usecase, repository, storage } = build({ isPublic: true, photoPath: "photos/1.jpg" });

    expect(await usecase.execute({ pathSlug: "sample-taro", previewSecret: SECRET })).toBe(
      "https://storage.example/signed",
    );
    expect(repository.findPhoto).toHaveBeenCalledWith("sample-taro");
    expect(storage.createSignedUrl).toHaveBeenCalledWith("photos/1.jpg", 300);
  });

  it("非公開の議員の写真は、プレビュー用の文字列が無ければ返さない", async () => {
    const { usecase, storage } = build({ isPublic: false, photoPath: "photos/1.jpg" });

    expect(await usecase.execute({ pathSlug: "sample-taro", previewSecret: SECRET })).toBeNull();
    expect(
      await usecase.execute({ pathSlug: `sample-taro~${"0".repeat(32)}`, previewSecret: SECRET }),
    ).toBeNull();
    expect(storage.createSignedUrl).not.toHaveBeenCalled();
  });

  it("非公開の議員でも、正しいプレビュー URL の slug の区間なら返す", async () => {
    const { usecase, repository } = build({ isPublic: false, photoPath: "photos/1.jpg" });

    expect(
      await usecase.execute({ pathSlug: `sample-taro~${TOKEN}`, previewSecret: SECRET }),
    ).toBe("https://storage.example/signed");
    expect(repository.findPhoto).toHaveBeenCalledWith("sample-taro");
  });

  it("議員がいない・写真が未登録なら返さない", async () => {
    expect(await build(null).usecase.execute({ pathSlug: "nobody", previewSecret: SECRET })).toBeNull();
    expect(
      await build({ isPublic: true, photoPath: null }).usecase.execute({
        pathSlug: "sample-taro",
        previewSecret: SECRET,
      }),
    ).toBeNull();
  });
});
