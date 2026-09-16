import { ManageJournalReviewUsecase } from "@/server/contexts/research-fund/application/usecases/manage-journal-review-usecase";
import type { JournalEdit, ReviewEntry } from "@/server/contexts/research-fund/domain/models/journal-review";
const input: JournalEdit = { entryDate: "2026-08-01", description: "視察の移動", amount: 1200, accountKey: "taxi", note: "公開メモ", memo: "内部メモ" };
const entry: ReviewEntry = { ...input, id: "2", source: "scan", documentId: "3", splitGroup: "group", status: "draft", updatedAt: "2026-08-01T12:00:00.000Z", model: "test-model", promptVersion: 1 };
function setup(overrides: Partial<ReviewEntry> = {}) {
  const repository = { list: jest.fn().mockResolvedValue([entry]), find: jest.fn().mockResolvedValue({ ...entry, ...overrides }), findMany: jest.fn().mockResolvedValue([{ ...entry, ...overrides }]), approveMany: jest.fn(), accounts: jest.fn().mockResolvedValue([{ key: "taxi", label: "タクシー代", type: "expense" }, { key: "needs-review", label: "要確認", type: "expense" }, { key: "bank", label: "普通預金", type: "asset" }]), year: jest.fn().mockResolvedValue(2026), create: jest.fn().mockResolvedValue("10"), update: jest.fn(), discard: jest.fn() };
  return { repository, usecase: new ManageJournalReviewUsecase(repository) };
}
test("手動作成は下書き・複式の行・hashを保存する", async () => {
  const { repository, usecase } = setup();
  await expect(usecase.create("1", input, "user")).resolves.toBe("10");
  expect(repository.create).toHaveBeenCalledWith("1", expect.objectContaining({ ...input, status: "draft", hash: expect.stringMatching(/^[a-f0-9]{64}$/), lines: [{ side: "debit", accountKey: "taxi", amount: 1200 }, { side: "credit", accountKey: "bank", amount: 1200 }] }), "user");
});
test("編集して確認済にする。公開・非公開メモと書類由来のhashを保存", async () => {
  const { repository, usecase } = setup();
  await usecase.save("1", "2", entry.updatedAt, { ...input, amount: 1500 }, true);
  expect(repository.update).toHaveBeenCalledWith("1", entry, expect.objectContaining({ status: "approved", amount: 1500, note: "公開メモ", memo: "内部メモ", lines: [{ side: "debit", accountKey: "taxi", amount: 1500 }, { side: "credit", accountKey: "bank", amount: 1500 }] }));
});
test.each(["draft", "approved"] as const)("%s を保存・破棄できる", async status => {
  const { repository, usecase } = setup({ status });
  await usecase.save("1", "2", entry.updatedAt, input, false);
  expect(repository.update.mock.calls[0][2].status).toBe(status);
  await usecase.discard("1", "2", entry.updatedAt);
  expect(repository.discard).toHaveBeenCalled();
});
test.each([{ status: "published" as const }, { source: "grant" as const }, { updatedAt: "new" }])("公開・支給・同時編集は保存と破棄を拒否 %j", async overrides => {
  const { repository, usecase } = setup(overrides);
  await expect(usecase.save("1", "2", entry.updatedAt, input, false)).rejects.toThrow();
  await expect(usecase.discard("1", "2", entry.updatedAt)).rejects.toThrow();
  expect(repository.update).not.toHaveBeenCalled(); expect(repository.discard).not.toHaveBeenCalled();
});
test.each([{ amount: 0 }, { amount: 1.5 }, { amount: 1e12 }, { entryDate: "2026-02-30" }, { entryDate: "2025-12-31" }, { description: " " }, { description: "a".repeat(256) }, { accountKey: "bank" }, { accountKey: "missing" }, { memo: null }])("不正な入力は保存しない %j", async override => {
  const { repository, usecase } = setup();
  await expect(usecase.create("1", { ...input, ...override } as JournalEdit, "user")).rejects.toThrow();
  expect(repository.create).not.toHaveBeenCalled();
});
test("未確定の科目は下書きで保存し、確認済への遷移を拒否", async () => {
  const { repository, usecase } = setup();
  await usecase.save("1", "2", entry.updatedAt, { ...input, accountKey: "needs-review" }, false);
  repository.update.mockClear();
  await expect(usecase.save("1", "2", entry.updatedAt, { ...input, accountKey: "needs-review" }, true)).rejects.toThrow("科目を確定");
  expect(repository.update).not.toHaveBeenCalled();
});
test("別帳簿の仕訳・存在しない仕訳は更新できない", async () => {
  const { repository, usecase } = setup(); repository.find.mockResolvedValue(null);
  await expect(usecase.save("9", "2", entry.updatedAt, input, true)).rejects.toThrow("見つかりません");
  expect(repository.find).toHaveBeenCalledWith("9", "2"); expect(repository.update).not.toHaveBeenCalled();
});
test("一覧には費用科目だけを渡す", async () => {
  const { usecase } = setup();
  const data = await usecase.list("1");
  expect(data.entries).toEqual([entry]); expect(data.accounts.map(a => a.key)).toEqual(["taxi", "needs-review"]);
});

const target = { id: entry.id, updatedAt: entry.updatedAt };
test("選んだ下書きをまとめて確認済にし、重複した指定は1件に畳む", async () => {
  const { repository, usecase } = setup();
  await expect(usecase.approveMany("1", [target, target])).resolves.toBe(1);
  expect(repository.findMany).toHaveBeenCalledWith("1", [entry.id]);
  expect(repository.approveMany).toHaveBeenCalledWith("1", [entry]);
});
test.each([
  [{ status: "published" as const }, "公開中"],
  [{ status: "approved" as const }, "下書きではありません"],
  [{ accountKey: "needs-review" }, "科目が未確定"],
  [{ updatedAt: "2026-09-01T00:00:00.000Z" }, "別の操作で更新されました"],
])("確認済にできない仕訳が混ざっていたら理由を示して1件も変更しない %j", async (overrides, message) => {
  const { repository, usecase } = setup(overrides);
  await expect(usecase.approveMany("1", [target])).rejects.toThrow(message);
  expect(repository.approveMany).not.toHaveBeenCalled();
});
test("支給・別帳簿など取得できない仕訳は黙って除外せず、まとめて拒否する", async () => {
  const { repository, usecase } = setup(); repository.findMany.mockResolvedValue([]);
  await expect(usecase.approveMany("1", [target])).rejects.toThrow("この画面で扱えない仕訳");
  expect(repository.approveMany).not.toHaveBeenCalled();
});
test("処理できる仕訳があっても、できない仕訳が1件でもあれば全体を中止する", async () => {
  const { repository, usecase } = setup();
  repository.findMany.mockResolvedValue([entry, { ...entry, id: "3", description: "要確認の支出", accountKey: "needs-review" }]);
  await expect(usecase.approveMany("1", [target, { id: "3", updatedAt: entry.updatedAt }])).rejects.toThrow("「要確認の支出」は科目が未確定です");
  expect(repository.approveMany).not.toHaveBeenCalled();
});
test.each([[[]], [[{ id: "0", updatedAt: entry.updatedAt }]], [[{ id: "a", updatedAt: entry.updatedAt }]]])("選択なし・不正なIDは取得もしない %j", async targets => {
  const { repository, usecase } = setup();
  await expect(usecase.approveMany("1", targets)).rejects.toThrow();
  expect(repository.findMany).not.toHaveBeenCalled(); expect(repository.approveMany).not.toHaveBeenCalled();
});
