import {
  planReceiptNumbers,
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
