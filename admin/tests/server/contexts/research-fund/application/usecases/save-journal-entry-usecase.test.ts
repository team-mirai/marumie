import { SaveJournalEntryUsecase } from "@/server/contexts/research-fund/application/usecases/save-journal-entry-usecase";
import type { ReviewEntry } from "@/server/contexts/research-fund/domain/models/journal-review";
import { entry, grant, grantInput, input, settled, setup } from "./journal-review-test-helpers";
function setupUsecase(overrides: Partial<ReviewEntry> = {}) {
  const { repository } = setup(overrides);
  return { repository, usecase: new SaveJournalEntryUsecase(repository) };
}
test("編集して確認済にする。公開・非公開メモと書類由来のhashを保存", async () => {
  const { repository, usecase } = setupUsecase();
  await usecase.execute("1", "2", entry.updatedAt, { ...input, amount: 1500 }, true);
  expect(repository.update).toHaveBeenCalledWith("1", entry, expect.objectContaining({ status: "approved", amount: 1500, note: "公開メモ", memo: "内部メモ", lines: [{ side: "debit", accountKey: "taxi", amount: 1500 }, { side: "credit", accountKey: "bank", amount: 1500 }] }));
});
test.each(["draft", "approved"] as const)("%s を保存できる", async status => {
  const { repository, usecase } = setupUsecase({ status });
  await usecase.execute("1", "2", entry.updatedAt, input, false);
  expect(repository.update.mock.calls[0][2].status).toBe(status);
});
test.each([{ status: "published" as const }, { updatedAt: "new" }])("公開・同時編集は保存を拒否 %j", async overrides => {
  const { repository, usecase } = setupUsecase(overrides);
  await expect(usecase.execute("1", "2", entry.updatedAt, input, false)).rejects.toThrow();
  expect(repository.update).not.toHaveBeenCalled();
});
test("未確定の科目は下書きで保存し、確認済への遷移を拒否", async () => {
  const { repository, usecase } = setupUsecase();
  await usecase.execute("1", "2", entry.updatedAt, { ...input, accountKey: "needs-review" }, false);
  repository.update.mockClear();
  await expect(usecase.execute("1", "2", entry.updatedAt, { ...input, accountKey: "needs-review" }, true)).rejects.toThrow("科目を確定");
  expect(repository.update).not.toHaveBeenCalled();
});
test("要確認の下書きは、科目を確定する保存なら確認済にできる", async () => {
  const { repository, usecase } = setupUsecase({ accountKey: "needs-review" });
  await usecase.execute("1", "2", entry.updatedAt, { ...input, accountKey: "taxi" }, true);
  expect(repository.update.mock.calls[0][2]).toMatchObject({ status: "approved", accountKey: "taxi" });
});
test("確認済の仕訳は科目を要確認に戻す保存を拒否", async () => {
  const { repository, usecase } = setupUsecase({ status: "approved" });
  await expect(usecase.execute("1", "2", entry.updatedAt, { ...input, accountKey: "needs-review" }, false)).rejects.toThrow("科目を確定");
  expect(repository.update).not.toHaveBeenCalled();
});
test("別帳簿の仕訳・存在しない仕訳は更新できない", async () => {
  const { repository, usecase } = setupUsecase(); repository.find.mockResolvedValue(null);
  await expect(usecase.execute("9", "2", entry.updatedAt, input, true)).rejects.toThrow("見つかりません");
  expect(repository.find).toHaveBeenCalledWith("9", "2"); expect(repository.update).not.toHaveBeenCalled();
});

test("確認済の支給は月内の支給日に直せ、hash を作り直す。金額・項目名・科目は変わらない", async () => {
  const { repository, usecase } = setupUsecase(grant);
  await usecase.execute("1", "2", entry.updatedAt, { ...grantInput, entryDate: "2026-08-20" }, false);
  expect(repository.termStart).toHaveBeenCalledWith("1");
  const write = repository.update.mock.calls[0][2];
  expect(write).toMatchObject({ entryDate: "2026-08-20", amount: 1_000_000, description: "調査研究広報滞在費 8月分", accountKey: "grant-income", status: "approved", lines: [{ side: "debit", accountKey: "bank", amount: 1_000_000 }, { side: "credit", accountKey: "grant-income", amount: 1_000_000 }] });
  await usecase.execute("1", "2", entry.updatedAt, grantInput, false);
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
  const { repository, usecase } = setupUsecase(grant);
  await expect(usecase.execute("1", "2", entry.updatedAt, { ...grantInput, ...override }, false)).rejects.toThrow(message);
  expect(repository.update).not.toHaveBeenCalled();
});
test("当選月の支給は当選日より前の日付にできない", async () => {
  const { repository, usecase } = setupUsecase({ ...grant, entryDate: "2026-07-15", description: "調査研究広報滞在費 7月分" });
  await expect(usecase.execute("1", "2", entry.updatedAt, { ...grantInput, entryDate: "2026-07-14", description: "調査研究広報滞在費 7月分" }, false)).rejects.toThrow("当選日以降");
  await usecase.execute("1", "2", entry.updatedAt, { ...grantInput, entryDate: "2026-07-31", description: "調査研究広報滞在費 7月分" }, false);
  expect(repository.update.mock.calls[0][2].entryDate).toBe("2026-07-31");
});
test.each([
  [{ status: "published" as const }, "公開中"],
  [{ updatedAt: "new" }, "別の操作で更新されました"],
])("公開中・同時更新された支給は日付を直せない %j", async (overrides, message) => {
  const { repository, usecase } = setupUsecase({ ...grant, ...overrides });
  await expect(usecase.execute("1", "2", entry.updatedAt, { ...grantInput, entryDate: "2026-08-20" }, false)).rejects.toThrow(message);
  expect(repository.update).not.toHaveBeenCalled();
});
test("支給は確認済にする操作を受け付けない", async () => {
  const { repository, usecase } = setupUsecase(grant);
  await expect(usecase.execute("1", "2", entry.updatedAt, grantInput, true)).rejects.toThrow("すでに確認済");
  expect(repository.update).not.toHaveBeenCalled();
});
test("精算済の仕訳は金額を変更できない。項目名だけなら変更できる", async () => {
  const { repository, usecase } = setupUsecase(settled);
  await expect(usecase.execute("1", "2", entry.updatedAt, { ...input, amount: 1500 }, false)).rejects.toThrow("精算済の仕訳は金額を変更できません");
  expect(repository.update).not.toHaveBeenCalled();
  await usecase.execute("1", "2", entry.updatedAt, { ...input, description: "別の項目名" }, false);
  expect(repository.update).toHaveBeenCalled();
});
