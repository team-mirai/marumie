import { GetPoliticianUsecase } from "@/server/contexts/shared/application/usecases/get-politician-usecase";
import type { IPoliticianRepository } from "@/server/contexts/shared/domain/repositories/politician-repository.interface";
import type { PoliticianInput } from "@/shared/models/politician";

const input: PoliticianInput = {
  name: " 議員名 ",
  slug: " test-member ",
  termStart: "2026-02-08",
  politicalOrganizationId: "",
};
let repository: jest.Mocked<IPoliticianRepository>;
let usecase: GetPoliticianUsecase;
beforeEach(() => {
  repository = { findAll: jest.fn(), findById: jest.fn(), save: jest.fn(), delete: jest.fn() };
  usecase = new GetPoliticianUsecase(repository);
});
test("議員を取得する", async () => {
  const politician = { ...input, id: "1", politicalOrganizationName: null };
  repository.findById.mockResolvedValue(politician);
  expect(await usecase.execute("1")).toEqual(politician);
  expect(repository.findById).toHaveBeenCalledWith("1");
});
test("不正IDはリポジトリへ渡さない", async () => {
  expect(await usecase.execute("abc")).toBeNull();
  expect(repository.findById).not.toHaveBeenCalled();
});
