import { RollbackPromptUsecase } from "@/server/contexts/research-fund/application/usecases/rollback-prompt-usecase";
import type { PromptRepository } from "@/server/contexts/research-fund/domain/repositories/prompt-repository.interface";
function setup() {
  const repository: jest.Mocked<PromptRepository> = { list: jest.fn(), create: jest.fn(), activate: jest.fn(), findActive: jest.fn() };
  return { repository, usecase: new RollbackPromptUsecase(repository) };
}
test("巻き戻しは既存の版を有効にするだけで、新しい版を作らない", async () => {
  const { repository, usecase } = setup();
  await usecase.execute("2", 1);
  expect(repository.activate).toHaveBeenCalledWith("2", 1);
  expect(repository.create).not.toHaveBeenCalled();
});
test.each([0, -1, 1.5, NaN, "1", null])("不正な版の指定では巻き戻さない: %j", async (version) => {
  const { repository, usecase } = setup();
  await expect(usecase.execute("2", version)).rejects.toThrow("版の指定");
  expect(repository.activate).not.toHaveBeenCalled();
});
test.each(["", "0", "-1", "abc"])("不正な議員IDではリポジトリを呼ばない: %j", async (politicianId) => {
  const { repository, usecase } = setup();
  await expect(usecase.execute(politicianId, 1)).rejects.toThrow("ID");
  expect(repository.activate).not.toHaveBeenCalled();
});
