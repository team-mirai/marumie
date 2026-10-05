import { GetExpenditureGroupFormUsecase } from "@/server/contexts/research-fund/application/usecases/get-expenditure-group-form-usecase";
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
  return { repository, usecase: new GetExpenditureGroupFormUsecase(repository) };
}

const linkable: LinkableEntry = {
  id: "10",
  entryDate: "2026-05-14",
  description: "明細10",
  amount: 3000,
  groupId: null,
};

test("新規フォームは紐づけ候補だけを返し、支出群は取りに行かない", async () => {
  const { repository, usecase } = setup();
  repository.entries.mockResolvedValue([linkable]);
  await expect(usecase.execute("3", null)).resolves.toEqual({ group: null, entries: [linkable] });
  expect(repository.find).not.toHaveBeenCalled();
});

test("編集フォームは既存の支出群を返し、見つからなければ投げる", async () => {
  const { repository, usecase } = setup();
  const group = { id: "1", title: "調査", description: "説明", outcomes: [], entryIds: ["10"] };
  repository.find.mockResolvedValue(group);
  await expect(usecase.execute("3", "1")).resolves.toMatchObject({ group });
  repository.find.mockResolvedValue(null);
  await expect(usecase.execute("3", "1")).rejects.toThrow("支出群が見つかりません");
});

test.each(["", "0", "-1", "abc"])("不正なIDではリポジトリを呼ばない: %j", async (id) => {
  const { repository, usecase } = setup();
  await expect(usecase.execute(id, null)).rejects.toThrow("ID");
  expect(repository.entries).not.toHaveBeenCalled();
  await expect(usecase.execute("3", id)).rejects.toThrow("ID");
  expect(repository.entries).not.toHaveBeenCalled();
  expect(repository.find).not.toHaveBeenCalled();
});
