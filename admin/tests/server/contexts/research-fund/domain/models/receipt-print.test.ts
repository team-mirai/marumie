import {
  groupReceiptPrintDocuments,
  isReceiptPrintScope,
  receiptPrintFilename,
  selectReceiptPrintDocuments,
} from "@/server/contexts/research-fund/domain/models/receipt-print";
import type { SubmissionLedgerEntry } from "@/server/contexts/research-fund/domain/models/submission-ledger";

const base: SubmissionLedgerEntry = { id: "1", entryDate: "2026-04-03", source: "scan", legalLabel: "⑨ 滞在費", description: "タクシー代", amount: 20000, payeeName: "東京タクシー", payeeAddress: null, note: null, documentId: "5", receiptNumber: 12, documentMime: "image/jpeg", receiptAbsent: false, receiptAbsenceReason: null };
const entry = (overrides: Partial<SubmissionLedgerEntry>): SubmissionLedgerEntry => ({ ...base, ...overrides });
const numbers = (entries: SubmissionLedgerEntry[], scope: "over-threshold" | "all" = "all") =>
  selectReceiptPrintDocuments(entries, scope).documents.map((d) => d.receiptNumber);

describe("書類の選別", () => {
  test("書類なしの仕訳は入れない", () => {
    expect(numbers([entry({ documentId: null, receiptNumber: null, documentMime: null })])).toEqual([]);
  });
  test("徴難の仕訳の書類は入れない（帳簿に番号が出ないので）。徴難でない仕訳も紐づく書類はその金額だけで数える", () => {
    const selection = selectReceiptPrintDocuments([entry({ receiptAbsent: true, receiptAbsenceReason: "振込のみ" }), entry({ id: "2", documentId: "6", receiptNumber: null, receiptAbsent: true }), entry({ id: "3", documentId: "7", receiptNumber: 4, amount: 6000 }), entry({ id: "4", documentId: "7", receiptNumber: 4, amount: 5000, receiptAbsent: true })], "all");
    expect(selection.documents.map((d) => [d.receiptNumber, d.totalAmount])).toEqual([[4, 6000]]);
    expect(selection.unnumberedCount).toBe(0);
  });
  test("複数の仕訳が紐づく書類は 1 回だけ入れ、金額は合計する", () => {
    const docs = groupReceiptPrintDocuments([entry({ id: "1", amount: 6000 }), entry({ id: "2", amount: 5000 })]);
    expect(docs).toHaveLength(1);
    expect(docs[0].totalAmount).toBe(11000);
  });
  test("未採番の書類は入れず、件数を数える", () => {
    const selection = selectReceiptPrintDocuments([entry({}), entry({ id: "2", documentId: "6", receiptNumber: null }), entry({ id: "3", documentId: "6", receiptNumber: null })], "all");
    expect(selection.documents.map((d) => d.receiptNumber)).toEqual([12]);
    expect(selection.unnumberedCount).toBe(1);
  });
  test("1万円超は書類単位の合計で判定し、ちょうど 10,000 円は入れない", () => {
    const entries = [
      entry({ id: "1", documentId: "1", receiptNumber: 1, amount: 10000 }),
      entry({ id: "2", documentId: "2", receiptNumber: 2, amount: 10001 }),
      entry({ id: "3", documentId: "3", receiptNumber: 3, amount: 6000 }),
      entry({ id: "4", documentId: "3", receiptNumber: 3, amount: 5000 }),
    ];
    expect(numbers(entries, "over-threshold")).toEqual([2, 3]);
    expect(numbers(entries, "all")).toEqual([1, 2, 3]);
  });
  test("未採番の件数も範囲で絞る", () => {
    const entries = [entry({ documentId: "1", receiptNumber: null, amount: 9000 }), entry({ id: "2", documentId: "2", receiptNumber: null, amount: 12000 })];
    expect(selectReceiptPrintDocuments(entries, "over-threshold").unnumberedCount).toBe(1);
    expect(selectReceiptPrintDocuments(entries, "all").unnumberedCount).toBe(2);
  });
});

describe("並び順", () => {
  test("大項目の番号順 → 日付 → 領収書等番号に並べ、区分なしは最後", () => {
    const entries = [
      entry({ id: "1", documentId: "1", receiptNumber: 1, legalLabel: null, entryDate: "2026-04-01" }),
      entry({ id: "2", documentId: "2", receiptNumber: 2, legalLabel: "⑩ その他の経費", entryDate: "2026-04-01" }),
      entry({ id: "3", documentId: "3", receiptNumber: 3, legalLabel: "③ 備品・消耗品費", entryDate: "2026-05-01" }),
      entry({ id: "4", documentId: "4", receiptNumber: 5, legalLabel: "③ 備品・消耗品費", entryDate: "2026-04-10" }),
      entry({ id: "5", documentId: "5", receiptNumber: 4, legalLabel: "③ 備品・消耗品費", entryDate: "2026-04-10" }),
    ];
    expect(numbers(entries)).toEqual([4, 5, 3, 2, 1]);
  });
  test("大項目の違う仕訳が混ざる書類は、最も小さい番号の大項目に入る", () => {
    const entries = [
      entry({ id: "1", documentId: "1", receiptNumber: 1, legalLabel: "⑤ 研修費", entryDate: "2026-04-01" }),
      entry({ id: "2", documentId: "2", receiptNumber: 2, legalLabel: "⑨ 滞在費", entryDate: "2026-04-01" }),
      entry({ id: "3", documentId: "2", receiptNumber: 2, legalLabel: "② 会議費", entryDate: "2026-06-01" }),
    ];
    expect(numbers(entries)).toEqual([2, 1]);
  });
  test("書類の日付は、大項目に関わらず紐づく仕訳のうち最も早い日付", () => {
    const entries = [
      entry({ id: "1", documentId: "1", receiptNumber: 1, legalLabel: "② 会議費", entryDate: "2026-05-01" }),
      entry({ id: "2", documentId: "2", receiptNumber: 2, legalLabel: "② 会議費", entryDate: "2026-06-01" }),
      entry({ id: "3", documentId: "2", receiptNumber: 2, legalLabel: "⑨ 滞在費", entryDate: "2026-04-01" }),
    ];
    expect(groupReceiptPrintDocuments(entries).find((d) => d.documentId === "2")?.firstDate).toBe("2026-04-01");
    expect(numbers(entries)).toEqual([2, 1]);
  });
});

test("範囲の指定を検証する", () => {
  expect(isReceiptPrintScope("over-threshold")).toBe(true);
  expect(isReceiptPrintScope("all")).toBe(true);
  expect(isReceiptPrintScope("over")).toBe(false);
});
test("ファイル名に議員・年度・範囲を入れる", () => {
  const book = { politicianSlug: "tanaka-taro", financialYear: 2026 };
  expect(receiptPrintFilename(book, "over-threshold")).toBe("research_fund_receipts_tanaka-taro_2026_over10000.pdf");
  expect(receiptPrintFilename(book, "all")).toBe("research_fund_receipts_tanaka-taro_2026_all.pdf");
});
