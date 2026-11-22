import {
  awaitsReceiptNumber,
  isReceiptNumberedEntry,
  planReceiptNumbers,
  RECEIPT_NUMBERED_ENTRY_CONDITION,
  type ReceiptNumberingDocument,
} from "@/server/contexts/research-fund/domain/models/receipt-number";

function doc(
  id: string,
  firstPublishedEntryDate: string | null,
  receiptNumber: number | null = null,
): ReceiptNumberingDocument {
  return { id, firstPublishedEntryDate, receiptNumber };
}

describe("planReceiptNumbers", () => {
  it("未採番の帳簿では、公開済みの仕訳の最も早い日付順に 1 から振る", () => {
    expect(
      planReceiptNumbers([
        doc("1", "2026-08-10"),
        doc("2", "2026-08-01"),
        doc("3", "2026-09-01"),
      ]),
    ).toEqual([
      { documentId: "2", receiptNumber: 1 },
      { documentId: "1", receiptNumber: 2 },
      { documentId: "3", receiptNumber: 3 },
    ]);
  });
  it("同じ日付なら書類の登録順（id 順。桁数が違っても数値として比べる）", () => {
    expect(
      planReceiptNumbers([
        doc("10", "2026-08-01"),
        doc("9", "2026-08-01"),
        doc("9007199254740993", "2026-08-01"),
      ]),
    ).toEqual([
      { documentId: "9", receiptNumber: 1 },
      { documentId: "10", receiptNumber: 2 },
      { documentId: "9007199254740993", receiptNumber: 3 },
    ]);
  });
  it("公開済みの仕訳が紐づいていない書類には振らない", () => {
    expect(planReceiptNumbers([doc("1", null), doc("2", "2026-08-01")])).toEqual([
      { documentId: "2", receiptNumber: 1 },
    ]);
  });
  it("採番済みの番号は変えず、日付が早くても帳簿内の最大番号 + 1 から振る", () => {
    expect(
      planReceiptNumbers([
        doc("1", "2026-09-01", 1),
        doc("2", "2026-09-02", 2),
        doc("3", "2026-08-01"),
        doc("4", "2026-07-01"),
      ]),
    ).toEqual([
      { documentId: "4", receiptNumber: 3 },
      { documentId: "3", receiptNumber: 4 },
    ]);
  });
  it("欠番は詰めない。仕訳が非公開になった採番済みの書類の番号も最大番号に数える", () => {
    expect(
      planReceiptNumbers([doc("1", "2026-08-01", 1), doc("2", null, 5), doc("3", "2026-08-02")]),
    ).toEqual([{ documentId: "3", receiptNumber: 6 }]);
  });
  it("振る書類が無ければ空", () => {
    expect(planReceiptNumbers([])).toEqual([]);
    expect(planReceiptNumbers([doc("1", "2026-08-01", 1), doc("2", null)])).toEqual([]);
  });
});

describe("isReceiptNumberedEntry", () => {
  const numbered = { status: "published", receiptAbsent: false, documentId: "5", receiptNumber: 3 };
  it("公開済みで、徴難でなく、書類が紐づく仕訳には領収書等番号が付く", () => {
    expect(isReceiptNumberedEntry(numbered)).toBe(true);
  });
  it.each(["draft", "approved"])("%s の仕訳には付かない", (status) => {
    expect(isReceiptNumberedEntry({ ...numbered, status })).toBe(false);
  });
  it("徴難の仕訳には、書類があっても付かない", () => {
    expect(isReceiptNumberedEntry({ ...numbered, receiptAbsent: true })).toBe(false);
  });
  it("書類の無い仕訳には付かない", () => {
    expect(isReceiptNumberedEntry({ ...numbered, documentId: null })).toBe(false);
  });
  it("リポジトリの検索条件は、述語のうち仕訳の列で決まる部分と同じ", () => {
    expect(RECEIPT_NUMBERED_ENTRY_CONDITION).toEqual({ status: "published", receiptAbsent: false });
  });
});

describe("awaitsReceiptNumber", () => {
  const numbered = { status: "published", receiptAbsent: false, documentId: "5", receiptNumber: null };
  it("領収書等番号が付く仕訳で、書類が未採番なら採番待ち", () => {
    expect(awaitsReceiptNumber(numbered)).toBe(true);
  });
  it("採番済みなら採番待ちではない", () => {
    expect(awaitsReceiptNumber({ ...numbered, receiptNumber: 1 })).toBe(false);
  });
  it("領収書等番号が付かない仕訳（下書き・徴難・書類なし）は採番待ちではない", () => {
    expect(awaitsReceiptNumber({ ...numbered, status: "draft" })).toBe(false);
    expect(awaitsReceiptNumber({ ...numbered, receiptAbsent: true })).toBe(false);
    expect(awaitsReceiptNumber({ ...numbered, documentId: null })).toBe(false);
  });
});
