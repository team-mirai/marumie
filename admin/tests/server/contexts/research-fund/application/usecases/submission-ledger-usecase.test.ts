import { ExportSubmissionLedgerCsvUsecase } from "@/server/contexts/research-fund/application/usecases/export-submission-ledger-csv-usecase";
import { GetSubmissionLedgerUsecase } from "@/server/contexts/research-fund/application/usecases/get-submission-ledger-usecase";
import type { SubmissionLedgerEntry } from "@/server/contexts/research-fund/domain/models/submission-ledger";

const entry: SubmissionLedgerEntry = { id: "1", entryDate: "2026-04-03", source: "manual", legalLabel: "⑨ 滞在費", description: "タクシー代", amount: 1200, payeeName: null, payeeAddress: null, note: null, documentId: null, receiptNumber: null, documentMime: null, receiptAbsenceReason: null };
function setup(ledger: unknown = { politicianSlug: "tanaka-taro", financialYear: 2026, entries: [entry] }) {
  return { find: jest.fn().mockResolvedValue(ledger), findDocumentStorageKeys: jest.fn() };
}

test("件数と提出前に確認が必要な仕訳を返す", async () => {
  const repository = setup();
  await expect(new GetSubmissionLedgerUsecase(repository).execute("7")).resolves.toEqual({
    financialYear: 2026, entryCount: 1, warnings: [{ entry, issues: ["payee-missing", "receipt-missing"] }],
    receiptPrintCounts: { "over-threshold": { documentCount: 0, unnumberedCount: 0 }, all: { documentCount: 0, unnumberedCount: 0 } },
  });
  expect(repository.find).toHaveBeenCalledWith("7");
});
test("院のフォーマットの CSV とファイル名を返す", async () => {
  const result = await new ExportSubmissionLedgerCsvUsecase(setup()).execute("7", "councillors");
  expect(result?.filename).toBe("research_fund_ledger_2026_councillors.csv");
  expect(result?.csv.split("\r\n")[1]).toBe('"⑨ 滞在費","タクシー代","1200","2026-04-03","","","","","","無","","","",""');
});
test.each(["", "0", "abc"])("帳簿 ID %j が不正なら帳簿を引かない", async bookId => {
  const repository = setup();
  await expect(new GetSubmissionLedgerUsecase(repository).execute(bookId)).resolves.toBeNull();
  await expect(new ExportSubmissionLedgerCsvUsecase(repository).execute(bookId, "representatives")).resolves.toBeNull();
  expect(repository.find).not.toHaveBeenCalled();
});
test("帳簿が無ければ null", async () => {
  await expect(new GetSubmissionLedgerUsecase(setup(null)).execute("7")).resolves.toBeNull();
  await expect(new ExportSubmissionLedgerCsvUsecase(setup(null)).execute("7", "representatives")).resolves.toBeNull();
});
test("領収書の印刷用 PDF に入る書類と未採番の書類を範囲ごとに数える", async () => {
  const withDocuments = [
    { ...entry, documentId: "5", receiptNumber: 1, amount: 20000 },
    { ...entry, id: "2", documentId: "6", receiptNumber: 2, amount: 3000 },
    { ...entry, id: "3", documentId: "7", receiptNumber: null, amount: 3000 },
  ];
  const result = await new GetSubmissionLedgerUsecase(setup({ politicianSlug: "tanaka-taro", financialYear: 2026, entries: withDocuments })).execute("7");
  expect(result?.receiptPrintCounts).toEqual({
    "over-threshold": { documentCount: 1, unnumberedCount: 0 },
    all: { documentCount: 2, unnumberedCount: 1 },
  });
});
