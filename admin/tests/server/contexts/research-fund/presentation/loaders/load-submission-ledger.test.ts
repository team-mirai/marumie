import { ExportSubmissionLedgerCsvUsecase } from "@/server/contexts/research-fund/application/usecases/export-submission-ledger-csv-usecase";
import { GetReceiptPrintManifestUsecase } from "@/server/contexts/research-fund/application/usecases/get-receipt-print-manifest-usecase";
import { GetSubmissionLedgerUsecase } from "@/server/contexts/research-fund/application/usecases/get-submission-ledger-usecase";
import { requireJournalTarget } from "@/server/contexts/research-fund/presentation/loaders/load-journal-review";
import { loadReceiptPrintManifest, loadSubmissionLedger, loadSubmissionLedgerCsv } from "@/server/contexts/research-fund/presentation/loaders/load-submission-ledger";
jest.mock("next/navigation", () => ({ notFound: jest.fn(() => { throw new Error("NOT_FOUND"); }) }));
jest.mock("@/server/contexts/research-fund/presentation/loaders/load-journal-review", () => ({ requireJournalTarget: jest.fn() }));
jest.mock("@/server/contexts/shared/infrastructure/prisma", () => ({ prisma: {} }));
jest.mock("@/server/contexts/research-fund/infrastructure/storage/build-document-storage", () => ({ buildDocumentStorage: jest.fn(() => ({})) }));
const target = { kind: "research-fund" as const, key: "book:1", name: "議員", year: 2026, politicianId: "2", bookId: "1", draftCount: 0 };
beforeEach(() => jest.mocked(requireJournalTarget).mockResolvedValue(target));
afterEach(() => jest.restoreAllMocks());

test("選択中の帳簿でなければ CSV を作らない（別の議員の帳簿は出さない）", async () => {
  jest.mocked(requireJournalTarget).mockResolvedValue(null);
  const execute = jest.spyOn(ExportSubmissionLedgerCsvUsecase.prototype, "execute");
  await expect(loadSubmissionLedgerCsv("2", "1", "representatives")).resolves.toBeNull();
  expect(requireJournalTarget).toHaveBeenCalledWith("2", "1");
  expect(execute).not.toHaveBeenCalled();
});
test("選択中の帳簿なら院のフォーマットで CSV を作る", async () => {
  const execute = jest.spyOn(ExportSubmissionLedgerCsvUsecase.prototype, "execute").mockResolvedValue({ filename: "a.csv", csv: "x" });
  await expect(loadSubmissionLedgerCsv("2", "1", "councillors")).resolves.toEqual({ filename: "a.csv", csv: "x" });
  expect(execute).toHaveBeenCalledWith("1", "councillors");
});
test("選択中の帳簿でなければ画面は 404", async () => {
  jest.mocked(requireJournalTarget).mockResolvedValue(null);
  const execute = jest.spyOn(GetSubmissionLedgerUsecase.prototype, "execute");
  await expect(loadSubmissionLedger("2", "1")).rejects.toThrow("NOT_FOUND");
  expect(execute).not.toHaveBeenCalled();
});
test("画面には件数・警告と対象を返す", async () => {
  const receiptPrintCounts = { "over-threshold": { documentCount: 0, unnumberedCount: 0 }, all: { documentCount: 0, unnumberedCount: 0 } };
  jest.spyOn(GetSubmissionLedgerUsecase.prototype, "execute").mockResolvedValue({ financialYear: 2026, entryCount: 0, warnings: [], receiptPrintCounts });
  await expect(loadSubmissionLedger("2", "1")).resolves.toEqual({ financialYear: 2026, entryCount: 0, warnings: [], receiptPrintCounts, target });
});
test("選択中の帳簿でなければ領収書の一覧を返さない（別の議員の書類は出さない）", async () => {
  jest.mocked(requireJournalTarget).mockResolvedValue(null);
  const execute = jest.spyOn(GetReceiptPrintManifestUsecase.prototype, "execute");
  await expect(loadReceiptPrintManifest("2", "1", "all")).resolves.toBeNull();
  expect(execute).not.toHaveBeenCalled();
});
test("選択中の帳簿なら範囲の領収書の一覧を、1 時間有効の URL で返す", async () => {
  const manifest = { filename: "a.pdf", receipts: [] };
  const execute = jest.spyOn(GetReceiptPrintManifestUsecase.prototype, "execute").mockResolvedValue(manifest);
  await expect(loadReceiptPrintManifest("2", "1", "over-threshold")).resolves.toEqual(manifest);
  expect(execute).toHaveBeenCalledWith("1", "over-threshold", 3600);
});
