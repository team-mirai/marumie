import { UnsettleJournalEntriesUsecase } from "@/server/contexts/research-fund/application/usecases/unsettle-journal-entries-usecase";
import type { ReviewEntry } from "@/server/contexts/research-fund/domain/models/journal-review";
import { advanced, grant, settled, setup, target } from "./journal-review-test-helpers";
function setupUsecase(overrides: Partial<ReviewEntry> = {}) {
  const { repository } = setup(overrides);
  return { repository, usecase: new UnsettleJournalEntriesUsecase(repository) };
}
test("精算済をまとめて未精算に戻せる", async () => {
  const { repository, usecase } = setupUsecase(settled);
  await expect(usecase.execute("1", [target])).resolves.toEqual({ unsettled: 1 });
  expect(repository.unsettleMany).toHaveBeenCalledWith("1", [settled]);
});
test("未精算の仕訳が混ざっていたら1件も未精算に戻さない", async () => {
  const { repository, usecase } = setupUsecase(advanced);
  await expect(usecase.execute("1", [target])).rejects.toThrow("未精算です");
  expect(repository.unsettleMany).not.toHaveBeenCalled();
});
test("取得した仕訳に支給が含まれていても1件の操作と同じ判定で拒否する", async () => {
  const { repository, usecase } = setupUsecase({ ...grant, settledAt: null, advancedBy: null });
  await expect(usecase.execute("1", [target])).rejects.toThrow("この画面で扱えない仕訳");
  expect(repository.unsettleMany).not.toHaveBeenCalled();
});
