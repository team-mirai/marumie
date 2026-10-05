import { DeleteExpenditureGroupUsecase } from "@/server/contexts/research-fund/application/usecases/delete-expenditure-group-usecase";
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
  return {
    repository,
    cacheInvalidator,
    usecase: new DeleteExpenditureGroupUsecase(repository, cacheInvalidator),
  };
}

test("削除は帳簿と支出群のIDをそのままリポジトリに渡し、webapp のキャッシュを無効化する", async () => {
  const { repository, cacheInvalidator, usecase } = setup();
  await expect(usecase.execute("3", "1")).resolves.toEqual({ cacheWarning: null });
  expect(repository.remove).toHaveBeenCalledWith("3", "1");
  expect(cacheInvalidator.invalidateWebappCache).toHaveBeenCalledTimes(1);
});

test("無効化に失敗しても削除は成功扱いにし、警告を返す", async () => {
  const { cacheInvalidator, usecase } = setup();
  cacheInvalidator.invalidateWebappCache.mockRejectedValue("unknown");
  await expect(usecase.execute("3", "1")).resolves.toEqual({
    cacheWarning: "ウェブアプリのキャッシュを更新できませんでした",
  });
});

test.each(["", "0", "-1", "abc"])("不正なIDではリポジトリを呼ばない: %j", async (id) => {
  const { repository, cacheInvalidator, usecase } = setup();
  await expect(usecase.execute(id, "1")).rejects.toThrow("ID");
  await expect(usecase.execute("3", id)).rejects.toThrow("ID");
  expect(repository.remove).not.toHaveBeenCalled();
  expect(cacheInvalidator.invalidateWebappCache).not.toHaveBeenCalled();
});
