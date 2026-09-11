import { createClient } from "@supabase/supabase-js";
import { GetDocumentUsecase } from "@/server/contexts/research-fund/application/usecases/get-document-usecase";
import { requireJournalTarget } from "@/server/contexts/research-fund/presentation/loaders/load-journal-review";
import { loadJournalDocument } from "@/server/contexts/research-fund/presentation/loaders/load-journal-document";
jest.mock("@supabase/supabase-js", () => ({ createClient: jest.fn(() => ({})) }));
jest.mock("@/server/contexts/research-fund/presentation/loaders/load-journal-review", () => ({ requireJournalTarget: jest.fn() }));
jest.mock("@/server/contexts/shared/infrastructure/prisma", () => ({ prisma: {} }));
beforeEach(() => {
  jest.clearAllMocks();
  jest.replaceProperty(process, "env", { ...process.env, SUPABASE_URL: "https://storage.example.test", SUPABASE_SERVICE_ROLE_KEY: "test-key", RESEARCH_FUND_DOCUMENT_BUCKET: "receipts" });
  jest.mocked(requireJournalTarget).mockResolvedValue({ kind: "research-fund", key: "book:1", name: "議員", year: 2026, politicianId: "2", bookId: "1", draftCount: 0 });
});
afterEach(() => jest.restoreAllMocks());
test("対象が不一致ならストレージにも書類にもアクセスしない", async () => {
  jest.mocked(requireJournalTarget).mockResolvedValue(null);
  const execute = jest.spyOn(GetDocumentUsecase.prototype, "execute");
  await expect(loadJournalDocument("2", "1", "3")).resolves.toBeNull();
  expect(requireJournalTarget).toHaveBeenCalledWith("2", "1");
  expect(createClient).not.toHaveBeenCalled();
  expect(execute).not.toHaveBeenCalled();
});
test.each(["SUPABASE_URL", "SUPABASE_SERVICE_ROLE_KEY", "RESEARCH_FUND_DOCUMENT_BUCKET"])("%s がなければ署名URLを生成しない", async key => {
  delete process.env[key];
  await expect(loadJournalDocument("2", "1", "3")).rejects.toThrow("領収書ストレージが未設定です");
  expect(createClient).not.toHaveBeenCalled();
});
test("検証した帳簿で5分有効の署名URLを取得する", async () => {
  const execute = jest.spyOn(GetDocumentUsecase.prototype, "execute").mockResolvedValue({ status: "valid", value: {
    document: { id: "3", bookId: "1", storageKey: "receipts/3", mime: "image/png", originalFilename: "receipt.png", createdAt: new Date("2026-08-01") }, signedUrl: "https://storage.example.test/signed-receipt",
  } });
  await expect(loadJournalDocument("2", "1", "3")).resolves.toEqual({ signedUrl: "https://storage.example.test/signed-receipt" });
  expect(execute).toHaveBeenCalledWith({ bookId: "1", documentId: "3", expiresIn: 300 });
  expect(createClient).toHaveBeenCalledWith("https://storage.example.test", "test-key", { auth: { persistSession: false, autoRefreshToken: false } });
});
test("書類が取得できない場合はURLを返さない", async () => {
  jest.spyOn(GetDocumentUsecase.prototype, "execute").mockResolvedValue({ status: "invalid", errors: [] });
  await expect(loadJournalDocument("2", "1", "3")).resolves.toBeNull();
});
