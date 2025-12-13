import {
  convertToBusinessIncomeSection,
  convertToGrantIncomeSection,
  convertToLoanIncomeSection,
  convertToOtherIncomeSection,
  resolveTransactionAmount,
  type BusinessIncomeTransaction,
  type GrantIncomeTransaction,
  type LoanIncomeTransaction,
  type OtherIncomeTransaction,
} from "@/server/contexts/report/domain/models/income-converter";

describe("convertToBusinessIncomeSection", () => {
  it("converts business transactions to BusinessIncomeSection", () => {
    const transactions: BusinessIncomeTransaction[] = [
      {
        transactionNo: "1",
        friendlyCategory: "機関紙発行",
        label: "機関紙",
        description: "機関紙発行収入",
        memo: null,
        debitAmount: 0,
        creditAmount: 120000,
      },
    ];

    const section = convertToBusinessIncomeSection(transactions);

    expect(section.totalAmount).toBe(120000);
    expect(section.rows).toHaveLength(1);
    expect(section.rows[0].gigyouSyurui).toBe("機関紙発行");
    expect(section.rows[0].kingaku).toBe(120000);
  });

  it("returns empty section when no transactions", () => {
    const section = convertToBusinessIncomeSection([]);

    expect(section.totalAmount).toBe(0);
    expect(section.rows).toHaveLength(0);
  });
});

describe("convertToLoanIncomeSection", () => {
  it("converts loan transactions to LoanIncomeSection", () => {
    const transactions: LoanIncomeTransaction[] = [
      {
        transactionNo: "1",
        friendlyCategory: "借入金",
        label: "銀行借入",
        description: "運転資金借入",
        memo: null,
        debitAmount: 0,
        creditAmount: 1000000,
        transactionDate: new Date("2024-04-01"),
        counterpartName: "株式会社テスト銀行",
        counterpartAddress: "東京都千代田区丸の内1-1-1",
      },
    ];

    const section = convertToLoanIncomeSection(transactions);

    expect(section.totalAmount).toBe(1000000);
    expect(section.rows).toHaveLength(1);
    expect(section.rows[0].kariiresaki).toBe("株式会社テスト銀行");
    expect(section.rows[0].kingaku).toBe(1000000);
  });
});

describe("convertToGrantIncomeSection", () => {
  it("converts grant transactions to GrantIncomeSection", () => {
    const transactionDate = new Date("2024-05-15");
    const transactions: GrantIncomeTransaction[] = [
      {
        transactionNo: "1",
        friendlyCategory: "交付金",
        label: "本部交付金",
        description: "本部からの交付金",
        memo: null,
        debitAmount: 0,
        creditAmount: 500000,
        transactionDate,
        counterpartName: "〇〇党本部",
        counterpartAddress: "東京都千代田区永田町1-1-1",
      },
    ];

    const section = convertToGrantIncomeSection(transactions);

    expect(section.totalAmount).toBe(500000);
    expect(section.rows).toHaveLength(1);
    expect(section.rows[0].honsibuNm).toBe("〇〇党本部");
    expect(section.rows[0].kingaku).toBe(500000);
    expect(section.rows[0].dt).toEqual(transactionDate);
    expect(section.rows[0].jimuAdr).toBe("東京都千代田区永田町1-1-1");
  });
});

describe("convertToOtherIncomeSection", () => {
  it("uses friendlyCategory for tekiyou when available", () => {
    const transactions: OtherIncomeTransaction[] = [
      {
        transactionNo: "1",
        friendlyCategory: "タグ名",
        label: "ラベル名",
        description: "説明",
        memo: null,
        debitAmount: 0,
        creditAmount: 150_000,
      },
    ];
    const section = convertToOtherIncomeSection(transactions);

    expect(section.rows[0].tekiyou).toBe("タグ名");
  });

  it("returns empty string when friendlyCategory is null", () => {
    const transactions: OtherIncomeTransaction[] = [
      {
        transactionNo: "1",
        friendlyCategory: null,
        label: "ラベル名",
        description: "説明",
        memo: null,
        debitAmount: 0,
        creditAmount: 150_000,
      },
    ];
    const section = convertToOtherIncomeSection(transactions);

    expect(section.rows[0].tekiyou).toBe("");
  });

  it("splits transactions into detailed rows and under-threshold bucket", () => {
    const transactions: OtherIncomeTransaction[] = [
      {
        transactionNo: "1",
        friendlyCategory: "テスト取引1",
        label: null,
        description: "説明1",
        memo: null,
        debitAmount: 0,
        creditAmount: 150_000,
      },
      {
        transactionNo: "2",
        friendlyCategory: "テスト取引2",
        label: null,
        description: "説明2",
        memo: null,
        debitAmount: 0,
        creditAmount: 90_000,
      },
    ];
    const section = convertToOtherIncomeSection(transactions);

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

  it("sets underThresholdAmount to 0 when not applicable", () => {
    const transactions: OtherIncomeTransaction[] = [
      {
        transactionNo: "3",
        friendlyCategory: "その他収入",
        label: null,
        description: "説明のみ設定",
        memo: "テストメモ",
        debitAmount: 0,
        creditAmount: 120_000,
      },
    ];
    const section = convertToOtherIncomeSection(transactions);

    expect(section.totalAmount).toBe(120_000);
    expect(section.underThresholdAmount).toBe(0);
    expect(section.rows[0].tekiyou).toBe("その他収入");
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

