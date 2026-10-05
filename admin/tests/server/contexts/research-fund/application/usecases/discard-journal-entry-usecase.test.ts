import { DiscardJournalEntryUsecase } from "@/server/contexts/research-fund/application/usecases/discard-journal-entry-usecase";
import type { ReviewEntry } from "@/server/contexts/research-fund/domain/models/journal-review";
import { entry, grant, settled, setup } from "./journal-review-test-helpers";
function setupUsecase(overrides: Partial<ReviewEntry> = {}) {
  const { repository } = setup(overrides);
  return { repository, usecase: new DiscardJournalEntryUsecase(repository) };
}
test.each(["draft", "approved"] as const)("%s を破棄できる", async status => {
  const { repository, usecase } = setupUsecase({ status });
  await usecase.execute("1", "2", entry.updatedAt);
  expect(repository.discard).toHaveBeenCalledWith("1", { ...entry, status });
});
test.each([{ status: "published" as const }, { updatedAt: "new" }])("公開・同時編集は破棄を拒否 %j", async overrides => {
  const { repository, usecase } = setupUsecase(overrides);
  await expect(usecase.execute("1", "2", entry.updatedAt)).rejects.toThrow();
  expect(repository.discard).not.toHaveBeenCalled();
});
test("支給は破棄を受け付けない", async () => {
  const { repository, usecase } = setupUsecase(grant);
  await expect(usecase.execute("1", "2", entry.updatedAt)).rejects.toThrow("破棄できません");
  expect(repository.discard).not.toHaveBeenCalled();
});
test("精算済の仕訳は破棄できない", async () => {
  const { repository, usecase } = setupUsecase(settled);
  await expect(usecase.execute("1", "2", entry.updatedAt)).rejects.toThrow("精算済の仕訳は破棄できません");
  expect(repository.discard).not.toHaveBeenCalled();
});
