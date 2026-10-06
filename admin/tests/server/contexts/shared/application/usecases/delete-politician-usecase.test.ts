import { DeletePoliticianUsecase } from "@/server/contexts/shared/application/usecases/delete-politician-usecase";
import type { IPoliticianRepository } from "@/server/contexts/shared/domain/repositories/politician-repository.interface";
import type { PoliticianInput } from "@/shared/models/politician";

const input: PoliticianInput = {
  name: " 議員名 ",
  slug: " test-member ",
  termStart: "2026-02-08",
  politicalOrganizationId: "",
};
let repository: jest.Mocked<IPoliticianRepository>;
let usecase: DeletePoliticianUsecase;
beforeEach(() => {
  repository = { findAll: jest.fn(), findById: jest.fn(), save: jest.fn(),
    setResearchFundPublic: jest.fn(),
    delete: jest.fn(),
  };
  usecase = new DeletePoliticianUsecase(repository);
});
test("既存議員を削除する", async () => {
  repository.findById.mockResolvedValue({ ...input, id: "1", politicalOrganizationName: null, isResearchFundPublic: false });
  await usecase.execute("1");
  expect(repository.delete).toHaveBeenCalledWith("1");
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
