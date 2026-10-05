import { ReorderExpenditureGroupsUsecase } from "@/server/contexts/research-fund/application/usecases/reorder-expenditure-groups-usecase";
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
    usecase: new ReorderExpenditureGroupsUsecase(repository, cacheInvalidator),
  };
}

test("並べ替えは渡された順をそのままリポジトリに渡し、webapp のキャッシュを無効化する", async () => {
  const { repository, cacheInvalidator, usecase } = setup();
  await expect(usecase.execute("3", ["2", "1", "3"])).resolves.toEqual({ cacheWarning: null });
  expect(repository.reorder).toHaveBeenCalledWith("3", ["2", "1", "3"]);
  expect(cacheInvalidator.invalidateWebappCache).toHaveBeenCalledTimes(1);
});

test("空の並びではリポジトリを呼ばず、無効化もしない", async () => {
  const { repository, cacheInvalidator, usecase } = setup();
  await expect(usecase.execute("3", [])).resolves.toEqual({ cacheWarning: null });
  expect(repository.reorder).not.toHaveBeenCalled();
  expect(cacheInvalidator.invalidateWebappCache).not.toHaveBeenCalled();
});

test("同じ支出群が2回出てくる並びは保存しない", async () => {
  const { repository, cacheInvalidator, usecase } = setup();
  await expect(usecase.execute("3", ["1", "2", "1"])).rejects.toThrow("並び順の指定が重複しています");
  expect(repository.reorder).not.toHaveBeenCalled();
  expect(cacheInvalidator.invalidateWebappCache).not.toHaveBeenCalled();
});

test.each(["", "0", "-1", "abc"])("不正なIDではリポジトリを呼ばない: %j", async (id) => {
  const { repository, usecase } = setup();
  await expect(usecase.execute(id, ["1"])).rejects.toThrow("ID");
  await expect(usecase.execute("3", ["1", id])).rejects.toThrow("ID");
  expect(repository.reorder).not.toHaveBeenCalled();
});
