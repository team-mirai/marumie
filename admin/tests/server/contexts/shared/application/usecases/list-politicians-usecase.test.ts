import { ListPoliticiansUsecase } from "@/server/contexts/shared/application/usecases/list-politicians-usecase";
import type { IPoliticianRepository } from "@/server/contexts/shared/domain/repositories/politician-repository.interface";
import type { PoliticianInput } from "@/shared/models/politician";

const input: PoliticianInput = {
  name: " 議員名 ",
  slug: " test-member ",
  termStart: "2026-02-08",
  politicalOrganizationId: "",
};
let repository: jest.Mocked<IPoliticianRepository>;
beforeEach(() => {
  repository = { findAll: jest.fn(), findById: jest.fn(), save: jest.fn(), delete: jest.fn() };
});
test("一覧を返す", async () => {
  const politician = { ...input, id: "1", politicalOrganizationName: null };
  repository.findAll.mockResolvedValue([politician]);
  expect(await new ListPoliticiansUsecase(repository).execute()).toEqual([politician]);
});
