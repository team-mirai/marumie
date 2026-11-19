import { CreateJournalEntryUsecase } from "@/server/contexts/research-fund/application/usecases/create-journal-entry-usecase";
import type { JournalEdit } from "@/server/contexts/research-fund/domain/models/journal-review";
import { input, setup } from "./journal-review-test-helpers";
function setupUsecase() {
  const { repository } = setup();
  return { repository, usecase: new CreateJournalEntryUsecase(repository) };
}
test("手動作成は下書き・複式の行・hashを保存する", async () => {
  const { repository, usecase } = setupUsecase();
  await expect(usecase.execute("1", input, "user")).resolves.toBe("10");
  expect(repository.create).toHaveBeenCalledWith("1", expect.objectContaining({ ...input, status: "draft", hash: expect.stringMatching(/^[a-f0-9]{64}$/), lines: [{ side: "debit", accountKey: "taxi", amount: 1200 }, { side: "credit", accountKey: "bank", amount: 1200 }] }), "user");
});
test.each([{ amount: 0 }, { amount: 1.5 }, { amount: 1e12 }, { entryDate: "2026-02-30" }, { entryDate: "2025-12-31" }, { description: " " }, { description: "a".repeat(256) }, { accountKey: "bank" }, { accountKey: "missing" }, { memo: null }])("不正な入力は保存しない %j", async override => {
  const { repository, usecase } = setupUsecase();
  await expect(usecase.execute("1", { ...input, ...override } as JournalEdit, "user")).rejects.toThrow();
  expect(repository.create).not.toHaveBeenCalled();
});
