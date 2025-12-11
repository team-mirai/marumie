import {
  aggregateOtherIncomeFromTransactions,
  convertToOtherIncomeSection,
  resolveTransactionAmount,
  type SectionTransaction,
  type OtherIncomeTransaction,
} from "@/server/domain/converters/income-converter";

describe("convertToOtherIncomeSection", () => {
  it("converts raw transactions to OtherIncomeSection", () => {
    const transactions: OtherIncomeTransaction[] = [
      {
        transactionNo: "1",
        friendlyCategory: "その他の収入",
        label: "寄附金",
        description: "寄附金収入",
        memo: null,
        debitAmount: 0,
        creditAmount: 150000,
      },
      {
        transactionNo: "2",
        friendlyCategory: "その他の収入",
        label: "少額収入",
        description: "10万円未満",
        memo: null,
        debitAmount: 0,
        creditAmount: 50000,
      },
    ];

    const section = convertToOtherIncomeSection(transactions);

    expect(section.totalAmount).toBe(200000);
    expect(section.underThresholdAmount).toBe(50000);
    expect(section.rows).toHaveLength(1);
    expect(section.rows[0].kingaku).toBe(150000);
  });
});

describe("aggregateOtherIncomeFromTransactions", () => {
  it("uses friendlyCategory for tekiyou when available", () => {
    const transactions: SectionTransaction[] = [
      {
        transactionNo: "1",
        friendlyCategory: "タグ名",
        label: "ラベル名",
        description: "説明",
        memo: null,
        amount: 150_000,
      },
    ];
    const section = aggregateOtherIncomeFromTransactions(transactions);

    expect(section.rows[0].tekiyou).toBe("タグ名");
  });

  it("falls back to label when friendlyCategory is null", () => {
    const transactions: SectionTransaction[] = [
      {
        transactionNo: "1",
        friendlyCategory: null,
        label: "ラベル名",
        description: "説明",
        memo: null,
        amount: 150_000,
      },
    ];
    const section = aggregateOtherIncomeFromTransactions(transactions);

    expect(section.rows[0].tekiyou).toBe("ラベル名");
  });

  it("splits transactions into detailed rows and under-threshold bucket", () => {
    const transactions: SectionTransaction[] = [
      {
        transactionNo: "1",
        friendlyCategory: "テスト取引1",
        label: null,
        description: "説明1",
        memo: null,
        amount: 150_000,
      },
      {
        transactionNo: "2",
        friendlyCategory: "テスト取引2",
        label: null,
        description: "説明2",
        memo: null,
        amount: 90_000,
      },
    ];
    const section = aggregateOtherIncomeFromTransactions(transactions);

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
    const transactions: SectionTransaction[] = [
      {
        transactionNo: "3",
        friendlyCategory: null,
        label: null,
        description: "説明のみ設定",
        memo: "テストメモ",
        amount: 120_000,
      },
    ];
    const section = aggregateOtherIncomeFromTransactions(transactions);

    expect(section.totalAmount).toBe(120_000);
    expect(section.underThresholdAmount).toBeNull();
    expect(section.rows[0].tekiyou).toBe("説明のみ設定");
    expect(section.rows[0].bikou).toContain("テストメモ");
    expect(section.rows[0].bikou).toContain("MF行番号: 3");
  });
});

describe("resolveTransactionAmount", () => {
  it("uses creditAmount when available", () => {
    expect(resolveTransactionAmount(0, 150000)).toBe(150000);
  });

  it("falls back to debitAmount when creditAmount is zero", () => {
    expect(resolveTransactionAmount(120000, 0)).toBe(120000);
  });

  it("returns 0 when both are invalid", () => {
    expect(resolveTransactionAmount(NaN, NaN)).toBe(0);
  });
});

