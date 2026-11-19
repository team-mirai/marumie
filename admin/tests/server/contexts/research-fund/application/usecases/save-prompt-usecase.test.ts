import { SavePromptUsecase } from "@/server/contexts/research-fund/application/usecases/save-prompt-usecase";
import type { PromptRepository } from "@/server/contexts/research-fund/domain/repositories/prompt-repository.interface";
function setup() {
  const repository: jest.Mocked<PromptRepository> = { list: jest.fn(), create: jest.fn(), activate: jest.fn(), findActive: jest.fn() };
  return { repository, usecase: new SavePromptUsecase(repository) };
}
test("保存は正規化した本文と更新者を渡し、採番された版を返す", async () => {
  const { repository, usecase } = setup();
  repository.create.mockResolvedValue(4);
  await expect(usecase.execute("2", "  本文  ", "user")).resolves.toBe(4);
  expect(repository.create).toHaveBeenCalledWith("2", "本文", "user");
});
test("空の本文は保存しない", async () => {
  const { repository, usecase } = setup();
  await expect(usecase.execute("2", "   ", "user")).rejects.toThrow("プロンプト本文");
  expect(repository.create).not.toHaveBeenCalled();
});
test.each(["", "0", "-1", "abc"])("不正な議員IDではリポジトリを呼ばない: %j", async (politicianId) => {
  const { repository, usecase } = setup();
  await expect(usecase.execute(politicianId, "本文", "user")).rejects.toThrow("ID");
  expect(repository.create).not.toHaveBeenCalled();
});
