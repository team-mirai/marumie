import { GetPoliticianDocumentUsecase } from "@/server/contexts/research-fund/application/usecases/get-politician-document-usecase";
import { requireJournalTarget } from "@/server/contexts/research-fund/presentation/loaders/load-journal-review";
import { loadPoliticianDocument } from "@/server/contexts/research-fund/presentation/loaders/load-politician-document";
jest.mock("@/server/contexts/research-fund/presentation/loaders/load-journal-review", () => ({ requireJournalTarget: jest.fn() }));
jest.mock("@/server/contexts/research-fund/infrastructure/storage/build-document-storage", () => ({ buildDocumentStorage: jest.fn() }));
jest.mock("@/server/contexts/shared/infrastructure/prisma", () => ({ prisma: {} }));
beforeEach(() => {
  jest.clearAllMocks();
  jest.mocked(requireJournalTarget).mockResolvedValue({ kind: "research-fund", key: "book:1", name: "議員", year: 2026, politicianId: "2", bookId: "1", draftCount: 0 });
});
afterEach(() => jest.restoreAllMocks());
test("対象が不一致なら書類にアクセスしない", async () => {
  jest.mocked(requireJournalTarget).mockResolvedValue(null);
  const execute = jest.spyOn(GetPoliticianDocumentUsecase.prototype, "execute");
  await expect(loadPoliticianDocument("2", "1", "3")).resolves.toBeNull();
  expect(requireJournalTarget).toHaveBeenCalledWith("2", "1");
  expect(execute).not.toHaveBeenCalled();
});
test("検証した議員の書類を5分有効の署名URLで返す", async () => {
  const execute = jest.spyOn(GetPoliticianDocumentUsecase.prototype, "execute").mockResolvedValue({ status: "valid", value: {
    document: { id: "3", bookId: "9", storageKey: "receipts/3", mime: "image/png", originalFilename: "receipt.png", createdAt: new Date("2026-08-01") }, signedUrl: "https://storage.example.test/signed-receipt",
  } });
  await expect(loadPoliticianDocument("2", "1", "3")).resolves.toEqual({ signedUrl: "https://storage.example.test/signed-receipt" });
  expect(execute).toHaveBeenCalledWith({ politicianId: "2", documentId: "3", expiresIn: 300 });
});
test("書類が取得できない場合はURLを返さない", async () => {
  jest.spyOn(GetPoliticianDocumentUsecase.prototype, "execute").mockResolvedValue({ status: "invalid", errors: [] });
  await expect(loadPoliticianDocument("2", "1", "3")).resolves.toBeNull();
});
