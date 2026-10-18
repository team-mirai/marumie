import { GetReceiptPrintManifestUsecase } from "@/server/contexts/research-fund/application/usecases/get-receipt-print-manifest-usecase";
import type { SubmissionLedgerEntry } from "@/server/contexts/research-fund/domain/models/submission-ledger";
import type { DocumentStorage } from "@/server/contexts/research-fund/domain/repositories/document-storage.interface";

const base: SubmissionLedgerEntry = { id: "1", entryDate: "2026-04-03", source: "scan", legalLabel: "⑨ 滞在費", description: "タクシー代", amount: 20000, payeeName: null, payeeAddress: null, note: null, documentId: "5", receiptNumber: 12, documentMime: "image/jpeg", receiptAbsenceReason: null };
const entries = [
  base,
  { ...base, id: "2", documentId: "6", receiptNumber: 3, legalLabel: "② 会議費", documentMime: "application/pdf" },
  { ...base, id: "3", documentId: "7", receiptNumber: 4, amount: 5000 },
  { ...base, id: "4", documentId: "8", receiptNumber: 9, legalLabel: "② 会議費" },
];
function setup(ledger: unknown = { politicianSlug: "tanaka-taro", financialYear: 2026, entries }) {
  const repository = {
    find: jest.fn().mockResolvedValue(ledger),
    findDocumentStorageKeys: jest.fn().mockResolvedValue(new Map([["5", "key-5"], ["6", "key-6"], ["7", "key-7"], ["8", "key-8"]])),
  };
  const storage: jest.Mocked<DocumentStorage> = {
    upload: jest.fn(),
    download: jest.fn(),
    remove: jest.fn(),
    createSignedUrl: jest.fn(async (key: string, _expiresIn: number) => ({ status: "valid" as const, value: `https://storage.test/${key}` })),
  };
  return { repository, storage, usecase: new GetReceiptPrintManifestUsecase(repository, storage) };
}

test("範囲の書類を印刷順に、署名付き URL つきで返す", async () => {
  const { repository, storage, usecase } = setup();
  await expect(usecase.execute("7", "over-threshold", 3600)).resolves.toEqual({
    filename: "research_fund_receipts_tanaka-taro_2026_over10000.pdf",
    receipts: [
      { receiptNumber: 3, mime: "application/pdf", url: "https://storage.test/key-6" },
      { receiptNumber: 9, mime: "image/jpeg", url: "https://storage.test/key-8" },
      { receiptNumber: 12, mime: "image/jpeg", url: "https://storage.test/key-5" },
    ],
  });
  expect(repository.findDocumentStorageKeys).toHaveBeenCalledWith("7", ["6", "8", "5"]);
  expect(storage.createSignedUrl).toHaveBeenCalledWith("key-6", 3600);
});
test("キーが無い・署名に失敗した書類は url を null にして一覧に残す", async () => {
  const { repository, storage, usecase } = setup();
  repository.findDocumentStorageKeys.mockResolvedValue(new Map([["5", "key-5"], ["8", "key-8"]]));
  storage.createSignedUrl.mockImplementation(async (key: string, _expiresIn: number) => {
    if (key === "key-8") throw new Error("signing failed");
    return { status: "valid", value: `https://storage.test/${key}` };
  });
  const result = await usecase.execute("7", "over-threshold", 3600);
  expect(result?.receipts.map((r) => [r.receiptNumber, r.url])).toEqual([[3, null], [9, null], [12, "https://storage.test/key-5"]]);
});
test.each(["", "abc"])("帳簿 ID %j が不正なら帳簿を引かない", async (bookId) => {
  const { repository, usecase } = setup();
  await expect(usecase.execute(bookId, "all", 3600)).resolves.toBeNull();
  expect(repository.find).not.toHaveBeenCalled();
});
test("帳簿が無ければ null", async () => {
  await expect(setup(null).usecase.execute("7", "all", 3600)).resolves.toBeNull();
});
