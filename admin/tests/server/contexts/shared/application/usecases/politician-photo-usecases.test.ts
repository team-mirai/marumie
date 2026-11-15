import { DeletePoliticianPhotoUsecase } from "@/server/contexts/shared/application/usecases/delete-politician-photo-usecase";
import { GetPoliticianPhotoUrlUsecase } from "@/server/contexts/shared/application/usecases/get-politician-photo-url-usecase";
import { UploadPoliticianPhotoUsecase } from "@/server/contexts/shared/application/usecases/upload-politician-photo-usecase";
import type { IPoliticianPhotoStorage } from "@/server/contexts/shared/domain/repositories/politician-photo-storage.interface";
import type { IPoliticianRepository } from "@/server/contexts/shared/domain/repositories/politician-repository.interface";
import type { Politician } from "@/shared/models/politician";

const politician: Politician = {
  id: "1",
  name: "議員名",
  slug: "test-member",
  termStart: "2026-02-08",
  politicalOrganizationId: "",
  politicalOrganizationName: null,
  isResearchFundPublic: false,
  nameKana: "",
  house: "",
  constituency: "",
  profileUrl: "",
  websiteUrl: "",
  snsUrls: [],
  photoPath: null,
};
const jpeg = new Uint8Array([0xff, 0xd8, 0xff, 0xe0, 0, 0]);

let repository: jest.Mocked<IPoliticianRepository>;
let storage: jest.Mocked<IPoliticianPhotoStorage>;
beforeEach(() => {
  repository = {
    findAll: jest.fn(),
    findById: jest.fn().mockResolvedValue(politician),
    save: jest.fn(),
    setResearchFundPublic: jest.fn(),
    setPhotoPath: jest.fn(),
    delete: jest.fn(),
  };
  storage = {
    upload: jest.fn(),
    remove: jest.fn(),
    createSignedUrl: jest.fn(),
  };
  jest.spyOn(console, "error").mockImplementation(() => {});
});
afterEach(() => jest.restoreAllMocks());

describe("UploadPoliticianPhotoUsecase", () => {
  it("写真を置いて議員の参照を付ける", async () => {
    await new UploadPoliticianPhotoUsecase(repository, storage).execute("1", jpeg);
    const path = storage.upload.mock.calls[0][0];
    expect(path).toMatch(/^politicians\/1\/[0-9a-f-]+\.jpg$/);
    expect(storage.upload).toHaveBeenCalledWith(path, jpeg, "image/jpeg");
    expect(repository.setPhotoPath).toHaveBeenCalledWith("1", path);
    expect(storage.remove).not.toHaveBeenCalled();
  });

  it("差し替えでは古い写真を消す", async () => {
    repository.findById.mockResolvedValue({ ...politician, photoPath: "politicians/1/old.png" });
    await new UploadPoliticianPhotoUsecase(repository, storage).execute("1", jpeg);
    expect(storage.remove).toHaveBeenCalledWith("politicians/1/old.png");
  });

  it("古い写真を消せなくても差し替えは成功にする", async () => {
    repository.findById.mockResolvedValue({ ...politician, photoPath: "politicians/1/old.png" });
    storage.remove.mockRejectedValue(new Error("storage down"));
    await expect(
      new UploadPoliticianPhotoUsecase(repository, storage).execute("1", jpeg),
    ).resolves.toBeUndefined();
    expect(repository.setPhotoPath).toHaveBeenCalled();
  });

  it("参照の付け替えに失敗したら置いた写真を消して失敗にする", async () => {
    repository.setPhotoPath.mockRejectedValue(new Error("db down"));
    await expect(
      new UploadPoliticianPhotoUsecase(repository, storage).execute("1", jpeg),
    ).rejects.toThrow("db down");
    expect(storage.remove).toHaveBeenCalledWith(storage.upload.mock.calls[0][0]);
  });

  it("画像でないファイルは置かない", async () => {
    await expect(
      new UploadPoliticianPhotoUsecase(repository, storage).execute("1", new Uint8Array([1, 2])),
    ).rejects.toThrow("顔写真は JPEG・PNG・WebP の画像にしてください");
    expect(storage.upload).not.toHaveBeenCalled();
  });

  it.each(["abc", "1"])("存在しない議員には置かない: %s", async (id) => {
    repository.findById.mockResolvedValue(null);
    await expect(
      new UploadPoliticianPhotoUsecase(repository, storage).execute(id, jpeg),
    ).rejects.toThrow("議員が見つかりません");
    expect(storage.upload).not.toHaveBeenCalled();
  });
});

describe("DeletePoliticianPhotoUsecase", () => {
  it("参照を外してから写真を消す", async () => {
    repository.findById.mockResolvedValue({ ...politician, photoPath: "politicians/1/a.jpg" });
    await new DeletePoliticianPhotoUsecase(repository, storage).execute("1");
    expect(repository.setPhotoPath).toHaveBeenCalledWith("1", null);
    expect(storage.remove).toHaveBeenCalledWith("politicians/1/a.jpg");
    expect(repository.setPhotoPath.mock.invocationCallOrder[0]).toBeLessThan(
      storage.remove.mock.invocationCallOrder[0],
    );
  });

  it("写真を消せなくても参照は外れたまま成功にする", async () => {
    repository.findById.mockResolvedValue({ ...politician, photoPath: "politicians/1/a.jpg" });
    storage.remove.mockRejectedValue(new Error("storage down"));
    await expect(
      new DeletePoliticianPhotoUsecase(repository, storage).execute("1"),
    ).resolves.toBeUndefined();
  });

  it("写真が無ければ何もしない", async () => {
    await new DeletePoliticianPhotoUsecase(repository, storage).execute("1");
    expect(repository.setPhotoPath).not.toHaveBeenCalled();
    expect(storage.remove).not.toHaveBeenCalled();
  });

  it("存在しない議員はエラー", async () => {
    repository.findById.mockResolvedValue(null);
    await expect(new DeletePoliticianPhotoUsecase(repository, storage).execute("1")).rejects.toThrow(
      "議員が見つかりません",
    );
  });
});

describe("GetPoliticianPhotoUrlUsecase", () => {
  it("写真の署名 URL を返す", async () => {
    storage.createSignedUrl.mockResolvedValue("https://example.com/signed");
    await expect(
      new GetPoliticianPhotoUrlUsecase(() => storage).execute("politicians/1/a.jpg"),
    ).resolves.toBe("https://example.com/signed");
    expect(storage.createSignedUrl).toHaveBeenCalledWith("politicians/1/a.jpg", 3600);
  });

  it("写真が無ければ Storage を使わず null", async () => {
    const factory = jest.fn(() => storage);
    await expect(new GetPoliticianPhotoUrlUsecase(factory).execute(null)).resolves.toBeNull();
    expect(factory).not.toHaveBeenCalled();
  });

  it("Storage が未設定・取得失敗なら null", async () => {
    await expect(
      new GetPoliticianPhotoUrlUsecase(() => {
        throw new Error("顔写真のストレージが未設定です");
      }).execute("politicians/1/a.jpg"),
    ).resolves.toBeNull();
  });
});
