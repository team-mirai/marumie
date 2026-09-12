import { notFound } from "next/navigation";
import { ManagePromptUsecase } from "@/server/contexts/research-fund/application/usecases/manage-prompt-usecase";
import { TestPromptUsecase } from "@/server/contexts/research-fund/application/usecases/test-prompt-usecase";
import { loadPrompts } from "@/server/contexts/research-fund/presentation/loaders/load-prompts";
import { requireJournalTarget } from "@/server/contexts/research-fund/presentation/loaders/load-journal-review";
import type { AdminTarget } from "@/server/contexts/shared/domain/models/admin-target";
jest.mock("next/navigation", () => ({ notFound: jest.fn(() => { throw new Error("NOT_FOUND"); }) }));
jest.mock("@/server/contexts/research-fund/presentation/loaders/load-journal-review", () => ({ requireJournalTarget: jest.fn() }));
jest.mock("@/server/contexts/shared/infrastructure/prisma", () => ({ prisma: {} }));
// テスト実行の usecase は Supabase の環境変数を要求するストレージを組み立てるため、組み立てだけ差し替える
jest.mock("@/server/contexts/research-fund/presentation/loaders/load-scan", () => ({ buildDocumentStorage: jest.fn() }));
const target: Extract<AdminTarget, { kind: "research-fund" }> = { kind: "research-fund", key: "book:1", name: "議員", year: 2026, politicianId: "2", bookId: "1", draftCount: 0 };
beforeEach(() => jest.clearAllMocks());
afterEach(() => jest.restoreAllMocks());
test("対象が一致しなければプロンプトを取得しない", async () => {
  jest.mocked(requireJournalTarget).mockResolvedValue(null);
  const list = jest.spyOn(ManagePromptUsecase.prototype, "list");
  const listDocuments = jest.spyOn(TestPromptUsecase.prototype, "listDocuments");
  await expect(loadPrompts("2", "1")).rejects.toThrow("NOT_FOUND");
  expect(notFound).toHaveBeenCalled();
  expect(list).not.toHaveBeenCalled();
  expect(listDocuments).not.toHaveBeenCalled();
});
test("帳簿ではなく議員のプロンプトを取得し、現在の対象を添えて返す", async () => {
  jest.mocked(requireJournalTarget).mockResolvedValue(target);
  const data = { versions: [], body: "本文", activeVersion: null, nextVersion: 1, automaticPrompt: "自動" };
  const list = jest.spyOn(ManagePromptUsecase.prototype, "list").mockResolvedValue(data);
  const testDocuments = [{ id: "9", originalFilename: "IMG_1.jpg", mime: "image/jpeg" }];
  const listDocuments = jest
    .spyOn(TestPromptUsecase.prototype, "listDocuments")
    .mockResolvedValue(testDocuments);
  await expect(loadPrompts("2", "1")).resolves.toEqual({ ...data, testDocuments, target });
  expect(list).toHaveBeenCalledWith("2");
  // 書類は帳簿ごと。プロンプトと違い politicianId ではなく bookId で引く
  expect(listDocuments).toHaveBeenCalledWith("1");
});
