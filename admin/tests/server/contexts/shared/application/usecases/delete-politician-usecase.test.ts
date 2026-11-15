import { DeletePoliticianUsecase } from "@/server/contexts/shared/application/usecases/delete-politician-usecase";
import type { IPoliticianPhotoStorage } from "@/server/contexts/shared/domain/repositories/politician-photo-storage.interface";
import type { IPoliticianRepository } from "@/server/contexts/shared/domain/repositories/politician-repository.interface";
import type { PoliticianInput } from "@/shared/models/politician";

const input: PoliticianInput = {
  name: " 議員名 ",
  slug: " test-member ",
  termStart: "2026-02-08",
  politicalOrganizationId: "",
  nameKana: "",
  house: "",
  constituency: "",
  profileUrl: "",
  websiteUrl: "",
  snsUrls: [],
};
const politicianWith = (photoPath: string | null) => ({
  ...input,
  id: "1",
  politicalOrganizationName: null,
  isResearchFundPublic: false,
  photoPath,
});
let repository: jest.Mocked<IPoliticianRepository>;
let storage: jest.Mocked<IPoliticianPhotoStorage>;
let storageFactory: jest.Mock<IPoliticianPhotoStorage, []>;
let usecase: DeletePoliticianUsecase;
beforeEach(() => {
  repository = { findAll: jest.fn(), findById: jest.fn(), save: jest.fn(),
    setResearchFundPublic: jest.fn(),
    setPhotoPath: jest.fn(),
    delete: jest.fn(),
  };
  storage = { upload: jest.fn(), remove: jest.fn(), createSignedUrl: jest.fn() };
  storageFactory = jest.fn(() => storage);
  usecase = new DeletePoliticianUsecase(repository, storageFactory);
});
test("既存議員を削除する", async () => {
  repository.findById.mockResolvedValue(politicianWith(null));
  await usecase.execute("1");
  expect(repository.delete).toHaveBeenCalledWith("1");
});
test("顔写真がある議員を削除すると、議員の削除の後に Storage の写真も消す", async () => {
  repository.findById.mockResolvedValue(politicianWith("1/photo.jpg"));
  await usecase.execute("1");
  expect(repository.delete).toHaveBeenCalledWith("1");
  expect(storage.remove).toHaveBeenCalledWith("1/photo.jpg");
  expect(repository.delete.mock.invocationCallOrder[0]).toBeLessThan(
    storage.remove.mock.invocationCallOrder[0],
  );
});
test("写真の削除に失敗しても議員の削除は成功する", async () => {
  const consoleError = jest.spyOn(console, "error").mockImplementation(() => {});
  repository.findById.mockResolvedValue(politicianWith("1/photo.jpg"));
  storage.remove.mockRejectedValue(new Error("storage down"));
  await expect(usecase.execute("1")).resolves.toBeUndefined();
  expect(repository.delete).toHaveBeenCalledWith("1");
  expect(consoleError).toHaveBeenCalled();
  consoleError.mockRestore();
});
test("Storage が未設定でも写真が無い議員は削除できる", async () => {
  storageFactory.mockImplementation(() => {
    throw new Error("Supabase Storage が設定されていません");
  });
  repository.findById.mockResolvedValue(politicianWith(null));
  await usecase.execute("1");
  expect(repository.delete).toHaveBeenCalledWith("1");
  expect(storageFactory).not.toHaveBeenCalled();
});
test("議員の削除に失敗したら写真は消さない", async () => {
  repository.findById.mockResolvedValue(politicianWith("1/photo.jpg"));
  repository.delete.mockRejectedValue(new Error("db error"));
  await expect(usecase.execute("1")).rejects.toThrow("db error");
  expect(storage.remove).not.toHaveBeenCalled();
});
test("存在しない議員は削除できない", async () => {
  repository.findById.mockResolvedValue(null);
  await expect(usecase.execute("1")).rejects.toThrow("議員が見つかりません");
  expect(repository.delete).not.toHaveBeenCalled();
});
test("不正IDでは削除しない", async () => {
  await expect(usecase.execute("abc")).rejects.toThrow("議員が見つかりません");
  expect(repository.findById).not.toHaveBeenCalled();
  expect(repository.delete).not.toHaveBeenCalled();
});
