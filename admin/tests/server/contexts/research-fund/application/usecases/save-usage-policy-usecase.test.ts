import { SaveUsagePolicyUsecase } from "@/server/contexts/research-fund/application/usecases/save-usage-policy-usecase";
import type { ExpenditureGroupRepository } from "@/server/contexts/research-fund/domain/repositories/expenditure-group-repository.interface";

function mockRepository() {
  const repository: jest.Mocked<ExpenditureGroupRepository> = {
    book: jest.fn(),
    savePolicyComment: jest.fn(),
    list: jest.fn(),
    find: jest.fn(),
    entries: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    remove: jest.fn(),
    reorder: jest.fn(),
  };
  repository.book.mockResolvedValue({ policyComment: "方針" });
  repository.list.mockResolvedValue([]);
  repository.entries.mockResolvedValue([]);
  return repository;
}

function setup() {
  const repository = mockRepository();
  const cacheInvalidator = { invalidateWebappCache: jest.fn().mockResolvedValue(undefined) };
  return { repository, cacheInvalidator, usecase: new SaveUsagePolicyUsecase(repository, cacheInvalidator) };
}

test("活用方針は前後の空白を落として保存し、webapp のキャッシュを無効化する", async () => {
  const { repository, cacheInvalidator, usecase } = setup();
  await expect(usecase.execute("3", "  調査ツールに重点  ")).resolves.toEqual({ cacheWarning: null });
  expect(repository.savePolicyComment).toHaveBeenCalledWith("3", "調査ツールに重点");
  expect(cacheInvalidator.invalidateWebappCache).toHaveBeenCalledTimes(1);
});

test.each([null, 1, undefined, "あ".repeat(2001)])("保存できない活用方針は保存も無効化もしない: %j", async (value) => {
  const { repository, cacheInvalidator, usecase } = setup();
  await expect(usecase.execute("3", value)).rejects.toThrow("活用方針");
  expect(repository.savePolicyComment).not.toHaveBeenCalled();
  expect(cacheInvalidator.invalidateWebappCache).not.toHaveBeenCalled();
});

test("無効化に失敗しても保存は成功扱いにし、警告を返す", async () => {
  const { repository, cacheInvalidator, usecase } = setup();
  cacheInvalidator.invalidateWebappCache.mockRejectedValue(new Error("refresh failed"));
  await expect(usecase.execute("3", "方針")).resolves.toEqual({ cacheWarning: "refresh failed" });
  expect(repository.savePolicyComment).toHaveBeenCalledWith("3", "方針");
});

test.each(["", "0", "-1", "abc"])("不正なIDではリポジトリを呼ばない: %j", async (id) => {
  const { repository, usecase } = setup();
  await expect(usecase.execute(id, "方針")).rejects.toThrow("ID");
  expect(repository.savePolicyComment).not.toHaveBeenCalled();
});
