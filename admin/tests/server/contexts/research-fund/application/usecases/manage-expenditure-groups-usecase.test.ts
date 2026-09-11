import { ManageExpenditureGroupsUsecase } from "@/server/contexts/research-fund/application/usecases/manage-expenditure-groups-usecase";
import type {
  ExpenditureGroupEdit,
  LinkableEntry,
} from "@/server/contexts/research-fund/domain/models/expenditure-group";
import type { ExpenditureGroupRepository } from "@/server/contexts/research-fund/domain/repositories/expenditure-group-repository.interface";

function setup() {
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
  return { repository, usecase: new ManageExpenditureGroupsUsecase(repository) };
}

function entry(id: string, entryDate: string, amount: number, groupId: string | null = null): LinkableEntry {
  return { id, entryDate, description: `明細${id}`, amount, groupId };
}

const edit: ExpenditureGroupEdit = {
  title: "議会質問づくりの相棒",
  description: "質問主意書の下調べに使った",
  outcomes: [],
  entryIds: [],
};

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
  const result = await usecase.list("3");
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
  await expect(usecase.list("3")).rejects.toThrow("帳簿");
});

test("新規フォームは紐づけ候補だけを返し、支出群は取りに行かない", async () => {
  const { repository, usecase } = setup();
  repository.entries.mockResolvedValue([entry("10", "2026-05-14", 3000)]);
  await expect(usecase.form("3", null)).resolves.toEqual({
    group: null,
    entries: [entry("10", "2026-05-14", 3000)],
  });
  expect(repository.find).not.toHaveBeenCalled();
});

test("編集フォームは既存の支出群を返し、見つからなければ投げる", async () => {
  const { repository, usecase } = setup();
  const group = { id: "1", title: "調査", description: "説明", outcomes: [], entryIds: ["10"] };
  repository.find.mockResolvedValue(group);
  await expect(usecase.form("3", "1")).resolves.toMatchObject({ group });
  repository.find.mockResolvedValue(null);
  await expect(usecase.form("3", "1")).rejects.toThrow("支出群が見つかりません");
});

test("活用方針は前後の空白を落として保存する", async () => {
  const { repository, usecase } = setup();
  await usecase.savePolicyComment("3", "  調査ツールに重点  ");
  expect(repository.savePolicyComment).toHaveBeenCalledWith("3", "調査ツールに重点");
});

test.each([null, 1, undefined])("文字列でない活用方針は保存しない: %j", async (value) => {
  const { repository, usecase } = setup();
  await expect(usecase.savePolicyComment("3", value)).rejects.toThrow("活用方針");
  expect(repository.savePolicyComment).not.toHaveBeenCalled();
});

test("長すぎる活用方針は保存しない", async () => {
  const { repository, usecase } = setup();
  await expect(usecase.savePolicyComment("3", "あ".repeat(2001))).rejects.toThrow("活用方針");
  expect(repository.savePolicyComment).not.toHaveBeenCalled();
});

test("新規作成は整えた入力をリポジトリに渡し、採番されたIDを返す", async () => {
  const { repository, usecase } = setup();
  repository.entries.mockResolvedValue([entry("10", "2026-05-14", 3000)]);
  repository.create.mockResolvedValue("7");
  await expect(
    usecase.save("3", null, {
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
  ).resolves.toBe("7");
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
  repository.entries.mockResolvedValue([entry("10", "2026-05-14", 3000, "1")]);
  await expect(usecase.save("3", "1", { ...edit, entryIds: ["10"] })).resolves.toBe("1");
  expect(repository.update).toHaveBeenCalledWith("3", "1", expect.objectContaining({ entryIds: ["10"] }));
  expect(repository.create).not.toHaveBeenCalled();
});

test("他の支出群に紐づいた仕訳は選べない", async () => {
  const { repository, usecase } = setup();
  repository.entries.mockResolvedValue([entry("10", "2026-05-14", 3000, "2")]);
  await expect(usecase.save("3", "1", { ...edit, entryIds: ["10"] })).rejects.toThrow(
    "他の支出群",
  );
  expect(repository.update).not.toHaveBeenCalled();
});

test("この帳簿にない仕訳は選べない", async () => {
  const { repository, usecase } = setup();
  repository.entries.mockResolvedValue([entry("10", "2026-05-14", 3000)]);
  await expect(usecase.save("3", null, { ...edit, entryIds: ["99"] })).rejects.toThrow("この帳簿");
  expect(repository.create).not.toHaveBeenCalled();
});

test.each([
  { ...edit, title: "   " },
  { ...edit, description: "" },
  { ...edit, title: "あ".repeat(256) },
])("タイトル・説明が欠けていれば保存しない: %j", async (input) => {
  const { repository, usecase } = setup();
  await expect(usecase.save("3", null, input)).rejects.toThrow("タイトルと説明");
  expect(repository.create).not.toHaveBeenCalled();
});

test("URLだけの成果物はラベルを求める", async () => {
  const { repository, usecase } = setup();
  await expect(
    usecase.save("3", null, { ...edit, outcomes: [{ label: "", url: "https://example.com" }] }),
  ).rejects.toThrow("ラベル");
  expect(repository.create).not.toHaveBeenCalled();
});

test.each(["example.com", "javascript:alert(1)", "ftp://example.com/a"])(
  "http(s) でない成果物のURLは保存しない: %s",
  async (url) => {
    const { repository, usecase } = setup();
    await expect(
      usecase.save("3", null, { ...edit, outcomes: [{ label: "議事録", url }] }),
    ).rejects.toThrow("URL");
    expect(repository.create).not.toHaveBeenCalled();
  },
);

test("削除は帳簿と支出群のIDをそのままリポジトリに渡す", async () => {
  const { repository, usecase } = setup();
  await usecase.remove("3", "1");
  expect(repository.remove).toHaveBeenCalledWith("3", "1");
});

test("並べ替えは渡された順をそのままリポジトリに渡す", async () => {
  const { repository, usecase } = setup();
  await usecase.reorder("3", ["2", "1", "3"]);
  expect(repository.reorder).toHaveBeenCalledWith("3", ["2", "1", "3"]);
});

test("空の並びではリポジトリを呼ばない", async () => {
  const { repository, usecase } = setup();
  await usecase.reorder("3", []);
  expect(repository.reorder).not.toHaveBeenCalled();
});

test("同じ支出群が2回出てくる並びは保存しない", async () => {
  const { repository, usecase } = setup();
  await expect(usecase.reorder("3", ["1", "2", "1"])).rejects.toThrow("重複");
  expect(repository.reorder).not.toHaveBeenCalled();
});

test.each(["", "0", "-1", "abc"])("不正なIDではリポジトリを呼ばない: %j", async (id) => {
  const { repository, usecase } = setup();
  await expect(usecase.list(id)).rejects.toThrow("ID");
  await expect(usecase.form(id, null)).rejects.toThrow("ID");
  await expect(usecase.form("3", id)).rejects.toThrow("ID");
  await expect(usecase.savePolicyComment(id, "方針")).rejects.toThrow("ID");
  await expect(usecase.save(id, null, edit)).rejects.toThrow("ID");
  await expect(usecase.save("3", id, edit)).rejects.toThrow("ID");
  await expect(usecase.remove(id, "1")).rejects.toThrow("ID");
  await expect(usecase.remove("3", id)).rejects.toThrow("ID");
  await expect(usecase.reorder(id, ["1"])).rejects.toThrow("ID");
  await expect(usecase.reorder("3", ["1", id])).rejects.toThrow("ID");
  expect(repository.create).not.toHaveBeenCalled();
  expect(repository.update).not.toHaveBeenCalled();
  expect(repository.savePolicyComment).not.toHaveBeenCalled();
  expect(repository.remove).not.toHaveBeenCalled();
  expect(repository.reorder).not.toHaveBeenCalled();
});
