import {
  aggregateOtherIncomeFromTransactions,
  serializeOtherIncomeSection,
  type OtherIncomeSection,
} from "@/server/xml/sections/syuushi07_06__other_income";

describe("aggregateOtherIncomeFromTransactions", () => {
  it("splits transactions into detailed rows and under-threshold bucket", () => {
    const section = aggregateOtherIncomeFromTransactions([
      {
        transactionNo: "1",
        label: "テスト取引1",
        description: "説明1",
        memo: "",
        amount: 150_000,
      },
      {
        transactionNo: "2",
        label: "テスト取引2",
        description: "説明2",
        memo: "",
        amount: 90_000,
      },
    ]);

    expect(section.totalAmount).toBe(240_000);
    expect(section.underThresholdAmount).toBe(90_000);
    expect(section.rows).toHaveLength(1);
    expect(section.rows[0]).toMatchObject({
      ichirenNo: "1",
      tekiyou: "テスト取引1",
      kingaku: 150_000,
    });
    expect(section.rows[0].bikou).toContain("MF行番号: 1");
  });

  it("sets underThresholdAmount to null when not applicable", () => {
    const section = aggregateOtherIncomeFromTransactions([
      {
        transactionNo: "3",
        label: "",
        description: "ラベル未設定",
        memo: "テストメモ",
        amount: 120_000,
      },
    ]);

    expect(section.totalAmount).toBe(120_000);
    expect(section.underThresholdAmount).toBeNull();
    expect(section.rows[0].tekiyou).toBe("ラベル未設定");
    expect(section.rows[0].bikou).toContain("テストメモ");
    expect(section.rows[0].bikou).toContain("MF行番号: 3");
  });
});

describe("serializeOtherIncomeSection", () => {
  it("serializes section into XML with escaping", () => {
    const section: OtherIncomeSection = {
      totalAmount: 200_000,
      underThresholdAmount: null,
      rows: [
        {
          ichirenNo: "1",
          tekiyou: "テスト & サンプル",
          kingaku: 200_000,
          bikou: "<memo>",
        },
      ],
    };

    const xml = serializeOtherIncomeSection(section);

    expect(xml).toContain("<SYUUSHI07_06>");
    expect(xml).toContain("&amp;");
    expect(xml).toContain("&lt;memo&gt;");
    expect(xml).toContain("<MIMAN_GK/>");
  });
});

