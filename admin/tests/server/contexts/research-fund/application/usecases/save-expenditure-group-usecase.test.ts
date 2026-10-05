import { SaveExpenditureGroupUsecase } from "@/server/contexts/research-fund/application/usecases/save-expenditure-group-usecase";
import type {
  ExpenditureGroupEdit,
  LinkableEntry,
} from "@/server/contexts/research-fund/domain/models/expenditure-group";
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
  repository.create.mockResolvedValue("7");
  const cacheInvalidator = { invalidateWebappCache: jest.fn().mockResolvedValue(undefined) };
  return {
    repository,
    cacheInvalidator,
    usecase: new SaveExpenditureGroupUsecase(repository, cacheInvalidator),
  };
}

function entry(id: string, groupId: string | null = null): LinkableEntry {
  return { id, entryDate: "2026-05-14", description: `明細${id}`, amount: 3000, groupId };
}

const edit: ExpenditureGroupEdit = {
  title: "議会質問づくりの相棒",
  description: "質問主意書の下調べに使った",
  outcomes: [],
  entryIds: [],
};

test("新規作成は整えた入力をリポジトリに渡し、採番されたIDを返す", async () => {
  const { repository, usecase } = setup();
  repository.entries.mockResolvedValue([entry("10")]);
  await expect(
    usecase.execute("3", null, {
      ...edit,
      title: "  相棒  ",
      description: "  説明  ",
      outcomes: [
        { label: "議事録", url: "https://example.com/m" },
        { label: "報告", url: "" },
        { label: "", url: "" },
      ],
      entryIds: ["10", "10"],
    }),
  ).resolves.toEqual({ id: "7", cacheWarning: null });
  expect(repository.create).toHaveBeenCalledWith("3", {
    title: "相棒",
    description: "説明",
    outcomes: [
      { label: "議事録", url: "https://example.com/m" },
      { label: "報告", url: null },
    ],
    entryIds: ["10"],
  });
});

test("編集は渡されたIDで更新し、そのIDを返す", async () => {
  const { repository, usecase } = setup();
  repository.entries.mockResolvedValue([entry("10", "1")]);
  await expect(usecase.execute("3", "1", { ...edit, entryIds: ["10"] })).resolves.toEqual({
    id: "1",
    cacheWarning: null,
  });
  expect(repository.update).toHaveBeenCalledWith("3", "1", expect.objectContaining({ entryIds: ["10"] }));
  expect(repository.create).not.toHaveBeenCalled();
});

test("他の支出群に紐づいた仕訳は選べない", async () => {
  const { repository, usecase } = setup();
  repository.entries.mockResolvedValue([entry("10", "2")]);
  await expect(usecase.execute("3", "1", { ...edit, entryIds: ["10"] })).rejects.toThrow(
    "他の支出群に紐づいている仕訳は選べません",
  );
  expect(repository.update).not.toHaveBeenCalled();
});

test("この帳簿にない仕訳は選べない", async () => {
  const { repository, usecase } = setup();
  repository.entries.mockResolvedValue([entry("10")]);
  await expect(usecase.execute("3", null, { ...edit, entryIds: ["99"] })).rejects.toThrow(
    "この帳簿にない仕訳は紐づけられません",
  );
  expect(repository.create).not.toHaveBeenCalled();
});

test.each([
  { ...edit, title: "   " },
  { ...edit, description: "" },
  { ...edit, title: "あ".repeat(256) },
])("タイトル・説明が欠けていれば保存しない: %j", async (input) => {
  const { repository, usecase } = setup();
  await expect(usecase.execute("3", null, input)).rejects.toThrow("タイトルと説明");
  expect(repository.create).not.toHaveBeenCalled();
});

test("URLだけの成果物はラベルを求める", async () => {
  const { repository, usecase } = setup();
  await expect(
    usecase.execute("3", null, { ...edit, outcomes: [{ label: "", url: "https://example.com" }] }),
  ).rejects.toThrow("ラベル");
  expect(repository.create).not.toHaveBeenCalled();
});

test.each(["example.com", "javascript:alert(1)", "ftp://example.com/a"])(
  "http(s) でない成果物のURLは保存しない: %s",
  async (url) => {
    const { repository, usecase } = setup();
    await expect(
      usecase.execute("3", null, { ...edit, outcomes: [{ label: "議事録", url }] }),
    ).rejects.toThrow("URL");
    expect(repository.create).not.toHaveBeenCalled();
  },
);

test.each(["", "0", "-1", "abc"])("不正なIDではリポジトリを呼ばない: %j", async (id) => {
  const { repository, usecase } = setup();
  await expect(usecase.execute(id, null, edit)).rejects.toThrow("ID");
  await expect(usecase.execute("3", id, edit)).rejects.toThrow("ID");
  expect(repository.create).not.toHaveBeenCalled();
  expect(repository.update).not.toHaveBeenCalled();
});

describe("公開ページに出る内容を保存したら webapp のキャッシュを無効化する", () => {
  test.each([
    ["用途の追加", null],
    ["用途の編集", "1"],
  ])("%s", async (_, groupId) => {
    const { cacheInvalidator, usecase } = setup();
    await expect(usecase.execute("3", groupId, edit)).resolves.toMatchObject({ cacheWarning: null });
    expect(cacheInvalidator.invalidateWebappCache).toHaveBeenCalledTimes(1);
  });

  test("保存に失敗したときは無効化しない", async () => {
    const { repository, cacheInvalidator, usecase } = setup();
    await expect(usecase.execute("3", null, { ...edit, entryIds: ["99"] })).rejects.toThrow("この帳簿");
    repository.update.mockRejectedValue(new Error("DB error"));
    await expect(usecase.execute("3", "1", edit)).rejects.toThrow("DB error");
    expect(cacheInvalidator.invalidateWebappCache).not.toHaveBeenCalled();
  });
});
