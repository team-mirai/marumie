import { ListExpenditureGroupsUsecase } from "@/server/contexts/research-fund/application/usecases/list-expenditure-groups-usecase";
import type { LinkableEntry } from "@/server/contexts/research-fund/domain/models/expenditure-group";
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
  return { repository, usecase: new ListExpenditureGroupsUsecase(repository) };
}

function entry(id: string, entryDate: string, amount: number, groupId: string | null = null): LinkableEntry {
  return { id, entryDate, description: `明細${id}`, amount, groupId };
}

test("一覧は紐づけた仕訳から金額・件数・期間を自動集計する", async () => {
  const { repository, usecase } = setup();
  repository.list.mockResolvedValue([
    { id: "1", title: "調査", description: "説明", outcomes: [], entryIds: ["10", "12"] },
    { id: "2", title: "紐づけ無し", description: "説明", outcomes: [], entryIds: [] },
  ]);
  repository.entries.mockResolvedValue([
    entry("10", "2026-05-14", 3000, "1"),
    entry("11", "2026-03-01", 500),
    entry("12", "2026-02-08", 1200, "1"),
  ]);
  const result = await usecase.execute("3");
  expect(result.policyComment).toBe("方針");
  expect(result.groups[0]).toMatchObject({
    amount: 4200,
    count: 2,
    period: { start: "2026-02-08", end: "2026-05-14" },
  });
  expect(result.groups[1]).toMatchObject({ amount: 0, count: 0, period: null });
});

test("帳簿が無ければ一覧を出さない", async () => {
  const { repository, usecase } = setup();
  repository.book.mockResolvedValue(null);
  await expect(usecase.execute("3")).rejects.toThrow("帳簿");
});

test.each(["", "0", "-1", "abc"])("不正なIDではリポジトリを呼ばない: %j", async (id) => {
  const { repository, usecase } = setup();
  await expect(usecase.execute(id)).rejects.toThrow("ID");
  expect(repository.book).not.toHaveBeenCalled();
});
