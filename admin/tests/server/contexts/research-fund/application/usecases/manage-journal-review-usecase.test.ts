import { ManageJournalReviewUsecase } from "@/server/contexts/research-fund/application/usecases/manage-journal-review-usecase";
import type { JournalEdit, ReviewEntry } from "@/server/contexts/research-fund/domain/models/journal-review";
const input: JournalEdit = { entryDate: "2026-08-01", description: "視察の移動", amount: 1200, accountKey: "taxi", note: "公開メモ", memo: "内部メモ" };
const entry: ReviewEntry = { ...input, id: "2", source: "scan", documentId: "3", splitGroup: "group", status: "draft", updatedAt: "2026-08-01T12:00:00.000Z", model: "test-model", promptVersion: 1 };
function setup(overrides: Partial<ReviewEntry> = {}) {
  const repository = { list: jest.fn().mockResolvedValue([entry]), find: jest.fn().mockResolvedValue({ ...entry, ...overrides }), findMany: jest.fn().mockResolvedValue([{ ...entry, ...overrides }]), approveMany: jest.fn(), unpublish: jest.fn(), accounts: jest.fn().mockResolvedValue([{ key: "taxi", label: "タクシー代", type: "expense" }, { key: "needs-review", label: "要確認", type: "expense" }, { key: "bank", label: "普通預金", type: "asset" }, { key: "grant-income", label: "調査研究費収入", type: "income" }]), year: jest.fn().mockResolvedValue(2026), termStart: jest.fn().mockResolvedValue("2026-07-15"), create: jest.fn().mockResolvedValue("10"), update: jest.fn(), discard: jest.fn() };
  const cacheInvalidator = { invalidateWebappCache: jest.fn().mockResolvedValue(undefined) };
  return { repository, cacheInvalidator, usecase: new ManageJournalReviewUsecase(repository, cacheInvalidator) };
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
test.each([{ status: "published" as const }, { updatedAt: "new" }])("公開・同時編集は保存と破棄を拒否 %j", async overrides => {
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

const grantInput: JournalEdit = { entryDate: "2026-08-01", description: "調査研究費 8月分", amount: 1_000_000, accountKey: "grant-income", note: "", memo: "" };
const grant = { ...grantInput, source: "grant" as const, documentId: null, splitGroup: null, status: "approved" as const, model: null, promptVersion: null };
test("確認済の支給は月内の支給日に直せ、hash を作り直す。金額・項目名・科目は変わらない", async () => {
  const { repository, usecase } = setup(grant);
  await usecase.save("1", "2", entry.updatedAt, { ...grantInput, entryDate: "2026-08-20" }, false);
  expect(repository.termStart).toHaveBeenCalledWith("1");
  const write = repository.update.mock.calls[0][2];
  expect(write).toMatchObject({ entryDate: "2026-08-20", amount: 1_000_000, description: "調査研究費 8月分", accountKey: "grant-income", status: "approved", lines: [{ side: "debit", accountKey: "bank", amount: 1_000_000 }, { side: "credit", accountKey: "grant-income", amount: 1_000_000 }] });
  await usecase.save("1", "2", entry.updatedAt, grantInput, false);
  expect(repository.update.mock.calls[1][2].hash).not.toBe(write.hash);
});
test.each([
  [{ entryDate: "2026-09-01" }, "その月の日付"],
  [{ entryDate: "2026-07-31" }, "その月の日付"],
  [{ entryDate: "2026-08-32" }, "支給日"],
  [{ amount: 2_000_000 }, "支給日だけ"],
  [{ description: "別の項目" }, "支給日だけ"],
  [{ accountKey: "taxi" }, "支給日だけ"],
  [{ note: "公開メモ" }, "支給日だけ"],
])("支給の月外の日付や、日付以外の変更は保存しない %j", async (override, message) => {
  const { repository, usecase } = setup(grant);
  await expect(usecase.save("1", "2", entry.updatedAt, { ...grantInput, ...override }, false)).rejects.toThrow(message);
  expect(repository.update).not.toHaveBeenCalled();
});
test("当選月の支給は当選日より前の日付にできない", async () => {
  const { repository, usecase } = setup({ ...grant, entryDate: "2026-07-15", description: "調査研究費 7月分" });
  await expect(usecase.save("1", "2", entry.updatedAt, { ...grantInput, entryDate: "2026-07-14", description: "調査研究費 7月分" }, false)).rejects.toThrow("当選日以降");
  await usecase.save("1", "2", entry.updatedAt, { ...grantInput, entryDate: "2026-07-31", description: "調査研究費 7月分" }, false);
  expect(repository.update.mock.calls[0][2].entryDate).toBe("2026-07-31");
});
test.each([
  [{ status: "published" as const }, "公開中"],
  [{ updatedAt: "new" }, "別の操作で更新されました"],
])("公開中・同時更新された支給は日付を直せない %j", async (overrides, message) => {
  const { repository, usecase } = setup({ ...grant, ...overrides });
  await expect(usecase.save("1", "2", entry.updatedAt, { ...grantInput, entryDate: "2026-08-20" }, false)).rejects.toThrow(message);
  expect(repository.update).not.toHaveBeenCalled();
});
test("支給は確認済にする操作・破棄を受け付けない", async () => {
  const { repository, usecase } = setup(grant);
  await expect(usecase.save("1", "2", entry.updatedAt, grantInput, true)).rejects.toThrow("すでに確認済");
  await expect(usecase.discard("1", "2", entry.updatedAt)).rejects.toThrow("破棄できません");
  expect(repository.update).not.toHaveBeenCalled(); expect(repository.discard).not.toHaveBeenCalled();
});
test("公開中の支給も確認済に戻し、webappのキャッシュを無効化する", async () => {
  const { repository, cacheInvalidator, usecase } = setup({ ...grant, status: "published" });
  await expect(usecase.unpublish("1", "2", entry.updatedAt)).resolves.toEqual({ cacheWarning: null });
  expect(repository.unpublish).toHaveBeenCalledWith("1", expect.objectContaining({ source: "grant", status: "published" }));
  expect(cacheInvalidator.invalidateWebappCache).toHaveBeenCalledTimes(1);
});

const target = { id: entry.id, updatedAt: entry.updatedAt };
test("選んだ下書きをまとめて確認済にし、重複した指定は1件に畳む", async () => {
  const { repository, usecase } = setup();
  await expect(usecase.approveMany("1", [target, target])).resolves.toEqual({ approved: 1, skipped: 0 });
  expect(repository.findMany).toHaveBeenCalledWith("1", [entry.id]);
  expect(repository.approveMany).toHaveBeenCalledWith("1", [entry]);
});
test.each([
  [{ status: "published" as const }, "公開中"],
  [{ status: "approved" as const }, "下書きではありません"],
  [{ status: "approved" as const, accountKey: "needs-review" }, "下書きではありません"],
  [{ accountKey: "needs-review", updatedAt: "2026-09-01T00:00:00.000Z" }, "別の操作で更新されました"],
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
test("処理できる仕訳があっても、要確認以外の理由でできない仕訳が1件でもあれば全体を中止する", async () => {
  const { repository, usecase } = setup();
  repository.findMany.mockResolvedValue([entry, { ...entry, id: "3", description: "公開中の支出", status: "published" }, { ...entry, id: "4", accountKey: "needs-review" }]);
  await expect(usecase.approveMany("1", [target, { id: "3", updatedAt: entry.updatedAt }, { id: "4", updatedAt: entry.updatedAt }])).rejects.toThrow("「公開中の支出」は公開中です");
  expect(repository.approveMany).not.toHaveBeenCalled();
});
test("科目が要確認の下書きは除外し、残りを確認済にして除外件数を返す", async () => {
  const { repository, usecase } = setup();
  const needsReview = { ...entry, id: "3", description: "要確認の支出", accountKey: "needs-review" };
  repository.findMany.mockResolvedValue([entry, needsReview]);
  await expect(usecase.approveMany("1", [target, { id: "3", updatedAt: entry.updatedAt }])).resolves.toEqual({ approved: 1, skipped: 1 });
  expect(repository.approveMany).toHaveBeenCalledWith("1", [entry]);
});
test("選んだ下書きがすべて要確認なら何も変更せず、確認済にできる仕訳がないと伝える", async () => {
  const { repository, usecase } = setup({ accountKey: "needs-review" });
  await expect(usecase.approveMany("1", [target])).rejects.toThrow("確認済にできる仕訳がありません");
  expect(repository.approveMany).not.toHaveBeenCalled();
});
test.each([[[]], [[{ id: "0", updatedAt: entry.updatedAt }]], [[{ id: "a", updatedAt: entry.updatedAt }]]])("選択なし・不正なIDは取得もしない %j", async targets => {
  const { repository, usecase } = setup();
  await expect(usecase.approveMany("1", targets)).rejects.toThrow();
  expect(repository.findMany).not.toHaveBeenCalled(); expect(repository.approveMany).not.toHaveBeenCalled();
});

test("公開中の仕訳を確認済に戻し、webappのキャッシュを無効化する", async () => {
  const { repository, cacheInvalidator, usecase } = setup({ status: "published" });
  await expect(usecase.unpublish("1", "2", entry.updatedAt)).resolves.toEqual({ cacheWarning: null });
  expect(repository.unpublish).toHaveBeenCalledWith("1", { ...entry, status: "published" });
  expect(cacheInvalidator.invalidateWebappCache).toHaveBeenCalledTimes(1);
});
test.each([
  [{ status: "draft" as const }, "公開中の仕訳だけを確認済に戻せます"],
  [{ status: "approved" as const }, "公開中の仕訳だけを確認済に戻せます"],
  [{ status: "published" as const, updatedAt: "2026-09-01T00:00:00.000Z" }, "別の操作で更新されました"],
])("戻せない仕訳は状態を変えずキャッシュにも触らない %j", async (overrides, message) => {
  const { repository, cacheInvalidator, usecase } = setup(overrides);
  await expect(usecase.unpublish("1", "2", entry.updatedAt)).rejects.toThrow(message);
  expect(repository.unpublish).not.toHaveBeenCalled();
  expect(cacheInvalidator.invalidateWebappCache).not.toHaveBeenCalled();
});
test("存在しない仕訳は戻せない", async () => {
  const { repository, usecase } = setup(); repository.find.mockResolvedValue(null);
  await expect(usecase.unpublish("1", "2", entry.updatedAt)).rejects.toThrow("見つかりません");
  expect(repository.unpublish).not.toHaveBeenCalled();
});
test("取り下げは確定済みなので、キャッシュ無効化の失敗は警告として返す", async () => {
  const { cacheInvalidator, usecase } = setup({ status: "published" });
  cacheInvalidator.invalidateWebappCache.mockRejectedValue(new Error("接続に失敗しました"));
  await expect(usecase.unpublish("1", "2", entry.updatedAt)).resolves.toEqual({ cacheWarning: "接続に失敗しました" });
});
