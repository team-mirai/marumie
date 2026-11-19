import { DiscardJournalEntriesUsecase } from "@/server/contexts/research-fund/application/usecases/discard-journal-entries-usecase";
import type { ReviewEntry } from "@/server/contexts/research-fund/domain/models/journal-review";
import { entry, grant, settled, setup, target } from "./journal-review-test-helpers";
function setupUsecase(overrides: Partial<ReviewEntry> = {}) {
  const { repository } = setup(overrides);
  return { repository, usecase: new DiscardJournalEntriesUsecase(repository) };
}
test("選んだ下書きをまとめて破棄し、重複した指定は1件に畳んで件数を返す", async () => {
  const { repository, usecase } = setupUsecase({ accountKey: "needs-review" });
  await expect(usecase.execute("1", [target, target])).resolves.toEqual({ discarded: 1 });
  expect(repository.findMany).toHaveBeenCalledWith("1", [entry.id]);
  expect(repository.discardMany).toHaveBeenCalledWith("1", [{ ...entry, accountKey: "needs-review" }]);
});
test.each([
  [{ status: "published" as const }, "公開中"],
  [{ updatedAt: "2026-09-01T00:00:00.000Z" }, "別の操作で更新されました"],
])("破棄できない仕訳が混ざっていたら理由と再読み込みを示して1件も削除しない %j", async (overrides, message) => {
  const { repository, usecase } = setupUsecase(overrides);
  await expect(usecase.execute("1", [target])).rejects.toThrow(message);
  await expect(usecase.execute("1", [target])).rejects.toThrow("まとめて破棄しませんでした");
  await expect(usecase.execute("1", [target])).rejects.toThrow("再読み込み");
  expect(repository.discardMany).not.toHaveBeenCalled();
});
test("まとめて破棄は、支給など取得できない仕訳が1件でもあれば全体を中止する", async () => {
  const { repository, usecase } = setupUsecase();
  repository.findMany.mockResolvedValue([entry]);
  await expect(usecase.execute("1", [target, { id: "3", updatedAt: entry.updatedAt }])).rejects.toThrow("この画面で扱えない仕訳");
  expect(repository.discardMany).not.toHaveBeenCalled();
});
test("まとめて破棄は、下書きと確認済を混ぜて選んでもまとめて削除する", async () => {
  const { repository, usecase } = setupUsecase();
  const approved = { ...entry, id: "3", description: "確認済の支出", status: "approved" as const };
  repository.findMany.mockResolvedValue([entry, approved]);
  await expect(usecase.execute("1", [target, { id: "3", updatedAt: entry.updatedAt }])).resolves.toEqual({ discarded: 2 });
  expect(repository.discardMany).toHaveBeenCalledWith("1", [entry, approved]);
});
test("まとめて破棄は、公開中が1件でも混ざっていれば確認済も削除しない", async () => {
  const { repository, usecase } = setupUsecase();
  repository.findMany.mockResolvedValue([{ ...entry, status: "approved" }, { ...entry, id: "3", description: "公開中の支出", status: "published" }]);
  await expect(usecase.execute("1", [target, { id: "3", updatedAt: entry.updatedAt }])).rejects.toThrow("「公開中の支出」は公開中です");
  expect(repository.discardMany).not.toHaveBeenCalled();
});
test.each([[[]], [[{ id: "0", updatedAt: entry.updatedAt }]], [[{ id: "a", updatedAt: entry.updatedAt }]]])("まとめて破棄は選択なし・不正なIDなら取得もしない %j", async targets => {
  const { repository, usecase } = setupUsecase();
  await expect(usecase.execute("1", targets)).rejects.toThrow();
  expect(repository.findMany).not.toHaveBeenCalled(); expect(repository.discardMany).not.toHaveBeenCalled();
});
test("精算済はまとめて破棄できない", async () => {
  const { repository, usecase } = setupUsecase(settled);
  await expect(usecase.execute("1", [target])).rejects.toThrow("精算済です");
  expect(repository.discardMany).not.toHaveBeenCalled();
});
test("取得した仕訳に支給が含まれていても1件の操作と同じ判定で拒否する", async () => {
  const { repository, usecase } = setupUsecase({ ...grant, settledAt: null, advancedBy: null });
  await expect(usecase.execute("1", [target])).rejects.toThrow("この画面で扱えない仕訳");
  expect(repository.discardMany).not.toHaveBeenCalled();
});
