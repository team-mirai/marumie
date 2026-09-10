import { ExtractedReceipt } from "@/server/contexts/research-fund/domain/models/extracted-receipt";
import { RECEIPT_CATEGORIES } from "@/server/contexts/research-fund/domain/models/receipt-categories";

const receipt = {
  date: "2026-09-10",
  items: [{ item: "書籍", amount: 1200, category_key: "books-newspapers" }],
};

describe("ExtractedReceipt.normalize", () => {
  it.each([...Object.keys(RECEIPT_CATEGORIES), "needs-review"])(
    "分類 %s を受け付ける",
    (category_key) => {
      expect(
        ExtractedReceipt.normalize({ ...receipt, items: [{ ...receipt.items[0], category_key }] })
          .status,
      ).toBe("valid");
    },
  );

  it.each([" BOOKS_NEWSPAPERS ", "books newspapers", "新聞・書籍代"])(
    "カテゴリ表記 %s と金額文字列・省略された任意項目を正規化する",
    (category_key) => {
      expect(
        ExtractedReceipt.normalize({
          date: " 2026-09-10 ",
          items: [{ item: " 書籍 ", amount: "￥１，２００円", category_key }],
        }),
      ).toEqual({
        status: "valid",
        value: {
          date: "2026-09-10",
          items: [{ ...receipt.items[0], note: null, split_group: null }],
        },
      });
    },
  );

  it("複数明細の特記事項と分割グループを保持する", () => {
    const items = [
      { ...receipt.items[0], note: " 調査用 ", split_group: " order-1 " },
      {
        item: "ペン",
        amount: 100,
        category_key: "stationery-supplies",
        note: null,
        split_group: "order-1",
      },
    ];
    expect(ExtractedReceipt.normalize({ ...receipt, items })).toEqual({
      status: "valid",
      value: {
        date: receipt.date,
        items: [{ ...items[0], note: "調査用", split_group: "order-1" }, items[1]],
      },
    });
  });

  it.each([
    0,
    -1,
    1.5,
    Infinity,
    NaN,
    1_000_000_000_000,
    null,
    undefined,
    true,
    "",
    "1,20",
    "12abc",
    "1e3",
    "1.5",
    "-100",
  ])("不正な金額 %s をRFエラーにする", (amount) => {
    const result = ExtractedReceipt.normalize({
      ...receipt,
      items: [{ ...receipt.items[0], amount }],
    });
    expect(result).toMatchObject({
      status: "invalid",
      errors: [{ path: "items.0.amount", code: "RF_INVALID_EXTRACTION_OUTPUT", severity: "error" }],
    });
  });

  it.each([
    null,
    {},
    { ...receipt, date: "2026-02-29" },
    { ...receipt, date: "2026-13-01" },
    { items: receipt.items },
    { ...receipt, items: [] },
    { ...receipt, items: [null] },
    ...["unknown", "bank", "grant-income", undefined].map((category_key) => ({
      ...receipt,
      items: [{ ...receipt.items[0], category_key }],
    })),
    { ...receipt, items: [{ ...receipt.items[0], item: " " }] },
    { ...receipt, items: [{ ...receipt.items[0], note: 12 }] },
  ])("欠損や不正な抽出結果を拒否する: %j", (input) => {
    expect(ExtractedReceipt.normalize(input)).toMatchObject({
      status: "invalid",
      errors: expect.arrayContaining([
        expect.objectContaining({ code: "RF_INVALID_EXTRACTION_OUTPUT" }),
      ]),
    });
  });

  it("閏日と上限金額を受け付ける", () => {
    expect(
      ExtractedReceipt.normalize({
        date: "2024-02-29",
        items: [{ ...receipt.items[0], amount: 999_999_999_999 }],
      }).status,
    ).toBe("valid");
  });
});
