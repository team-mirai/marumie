import { DeletePoliticalOrganizationPhotoUsecase } from "@/server/contexts/shared/application/usecases/delete-political-organization-photo-usecase";
import { UploadPoliticalOrganizationPhotoUsecase } from "@/server/contexts/shared/application/usecases/upload-political-organization-photo-usecase";
import type { IPoliticalOrganizationRepository } from "@/server/contexts/shared/domain/repositories/political-organization-repository.interface";
import type { IPoliticianPhotoStorage } from "@/server/contexts/shared/domain/repositories/politician-photo-storage.interface";
import type { ICacheInvalidator } from "@/server/contexts/shared/domain/services/cache-invalidator.interface";
import type { PoliticalOrganization } from "@/shared/models/political-organization";
import { POLITICIAN_PHOTO_MAX_BYTES } from "@/shared/models/politician-photo";

const organization: PoliticalOrganization = {
  id: "1",
  displayName: "テスト政治団体",
  orgName: null,
  slug: "test-org",
  description: null,
  websiteUrl: null,
  snsUrls: [],
  photoPath: null,
  createdAt: new Date("2024-01-01"),
  updatedAt: new Date("2024-01-01"),
};
const jpeg = new Uint8Array([0xff, 0xd8, 0xff, 0xe0, 0, 0]);

let repository: jest.Mocked<IPoliticalOrganizationRepository>;
let storage: jest.Mocked<IPoliticianPhotoStorage>;
let cacheInvalidator: jest.Mocked<ICacheInvalidator>;
beforeEach(() => {
  repository = {
    findAll: jest.fn(),
    findById: jest.fn().mockResolvedValue(organization),
    create: jest.fn(),
    update: jest.fn(),
    setPhotoPath: jest.fn(),
    delete: jest.fn(),
    countTransactions: jest.fn(),
  };
  storage = {
    upload: jest.fn(),
    remove: jest.fn(),
    createSignedUrl: jest.fn(),
  };
  cacheInvalidator = { invalidateWebappCache: jest.fn().mockResolvedValue(undefined) };
  jest.spyOn(console, "error").mockImplementation(() => {});
});
afterEach(() => jest.restoreAllMocks());

describe("UploadPoliticalOrganizationPhotoUsecase", () => {
  it("写真を置いて政治団体の参照を付ける", async () => {
    await new UploadPoliticalOrganizationPhotoUsecase(repository, storage, cacheInvalidator).execute("1", jpeg);
    const path = storage.upload.mock.calls[0][0];
    expect(path).toMatch(/^political-organizations\/1\/[0-9a-f-]+\.jpg$/);
    expect(storage.upload).toHaveBeenCalledWith(path, jpeg, "image/jpeg");
    expect(repository.findById).toHaveBeenCalledWith(BigInt(1));
    expect(repository.setPhotoPath).toHaveBeenCalledWith(BigInt(1), path);
    expect(storage.remove).not.toHaveBeenCalled();
  });

  it("登録したら webapp のキャッシュを消す", async () => {
    await expect(
      new UploadPoliticalOrganizationPhotoUsecase(repository, storage, cacheInvalidator).execute(
        "1",
        jpeg,
      ),
    ).resolves.toEqual({ cacheWarning: null });
    expect(cacheInvalidator.invalidateWebappCache).toHaveBeenCalledTimes(1);
  });

  it("キャッシュを消せなくても登録は成功にして警告を返す", async () => {
    cacheInvalidator.invalidateWebappCache.mockRejectedValue(new Error("接続に失敗しました"));
    await expect(
      new UploadPoliticalOrganizationPhotoUsecase(repository, storage, cacheInvalidator).execute(
        "1",
        jpeg,
      ),
    ).resolves.toEqual({ cacheWarning: "接続に失敗しました" });
    expect(repository.setPhotoPath).toHaveBeenCalled();
  });

  it("差し替えでは古い写真を消す", async () => {
    repository.findById.mockResolvedValue({
      ...organization,
      photoPath: "political-organizations/1/old.png",
    });
    await new UploadPoliticalOrganizationPhotoUsecase(repository, storage, cacheInvalidator).execute("1", jpeg);
    expect(storage.remove).toHaveBeenCalledWith("political-organizations/1/old.png");
  });

  it("古い写真を消せなくても差し替えは成功にする", async () => {
    repository.findById.mockResolvedValue({
      ...organization,
      photoPath: "political-organizations/1/old.png",
    });
    storage.remove.mockRejectedValue(new Error("storage down"));
    await expect(
      new UploadPoliticalOrganizationPhotoUsecase(repository, storage, cacheInvalidator).execute("1", jpeg),
    ).resolves.toEqual({ cacheWarning: null });
    expect(repository.setPhotoPath).toHaveBeenCalled();
  });

  it("参照の付け替えに失敗したら置いた写真を消して失敗にする", async () => {
    repository.setPhotoPath.mockRejectedValue(new Error("db down"));
    await expect(
      new UploadPoliticalOrganizationPhotoUsecase(repository, storage, cacheInvalidator).execute("1", jpeg),
    ).rejects.toThrow("db down");
    expect(cacheInvalidator.invalidateWebappCache).not.toHaveBeenCalled();
    expect(storage.remove).toHaveBeenCalledWith(storage.upload.mock.calls[0][0]);
  });

  it("画像でないファイルは置かない", async () => {
    await expect(
      new UploadPoliticalOrganizationPhotoUsecase(repository, storage, cacheInvalidator).execute(
        "1",
        new Uint8Array([1, 2]),
      ),
    ).rejects.toThrow("顔写真は JPEG・PNG・WebP の画像にしてください");
    expect(storage.upload).not.toHaveBeenCalled();
  });

  it("議員の顔写真と同じ上限を超える画像は置かない", async () => {
    const large = new Uint8Array(POLITICIAN_PHOTO_MAX_BYTES + 1);
    large.set(jpeg);
    await expect(
      new UploadPoliticalOrganizationPhotoUsecase(repository, storage, cacheInvalidator).execute("1", large),
    ).rejects.toThrow("顔写真は3MB以下の画像にしてください");
    expect(storage.upload).not.toHaveBeenCalled();
  });

  it.each(["abc", "1"])("存在しない政治団体には置かない: %s", async (id) => {
    repository.findById.mockResolvedValue(null);
    await expect(
      new UploadPoliticalOrganizationPhotoUsecase(repository, storage, cacheInvalidator).execute(id, jpeg),
    ).rejects.toThrow("政治団体が見つかりません");
    expect(storage.upload).not.toHaveBeenCalled();
  });
});

describe("DeletePoliticalOrganizationPhotoUsecase", () => {
  it("参照を外してから写真を消す", async () => {
    repository.findById.mockResolvedValue({
      ...organization,
      photoPath: "political-organizations/1/a.jpg",
    });
    await new DeletePoliticalOrganizationPhotoUsecase(repository, storage, cacheInvalidator).execute("1");
    expect(repository.setPhotoPath).toHaveBeenCalledWith(BigInt(1), null);
    expect(storage.remove).toHaveBeenCalledWith("political-organizations/1/a.jpg");
    expect(repository.setPhotoPath.mock.invocationCallOrder[0]).toBeLessThan(
      storage.remove.mock.invocationCallOrder[0],
    );
    expect(cacheInvalidator.invalidateWebappCache).toHaveBeenCalledTimes(1);
  });

  it("キャッシュを消せなくても削除は成功にして警告を返す", async () => {
    repository.findById.mockResolvedValue({
      ...organization,
      photoPath: "political-organizations/1/a.jpg",
    });
    cacheInvalidator.invalidateWebappCache.mockRejectedValue(new Error("接続に失敗しました"));
    await expect(
      new DeletePoliticalOrganizationPhotoUsecase(repository, storage, cacheInvalidator).execute("1"),
    ).resolves.toEqual({ cacheWarning: "接続に失敗しました" });
    expect(repository.setPhotoPath).toHaveBeenCalledWith(BigInt(1), null);
  });

  it("写真を消せなくても参照は外れたまま成功にする", async () => {
    repository.findById.mockResolvedValue({
      ...organization,
      photoPath: "political-organizations/1/a.jpg",
    });
    storage.remove.mockRejectedValue(new Error("storage down"));
    await expect(
      new DeletePoliticalOrganizationPhotoUsecase(repository, storage, cacheInvalidator).execute("1"),
    ).resolves.toEqual({ cacheWarning: null });
  });

  it("写真が無ければ何もしない", async () => {
    await new DeletePoliticalOrganizationPhotoUsecase(repository, storage, cacheInvalidator).execute("1");
    expect(repository.setPhotoPath).not.toHaveBeenCalled();
    expect(storage.remove).not.toHaveBeenCalled();
    expect(cacheInvalidator.invalidateWebappCache).not.toHaveBeenCalled();
  });

  it("存在しない政治団体はエラー", async () => {
    repository.findById.mockResolvedValue(null);
    await expect(
      new DeletePoliticalOrganizationPhotoUsecase(repository, storage, cacheInvalidator).execute("1"),
    ).rejects.toThrow("政治団体が見つかりません");
  });
});
