import {
  aggregateOtherIncomeFromTransactions,
  convertToIncomeSections,
  resolveTransactionAmount,
  type SectionTransaction,
  type IncomeTransaction,
  type IncomeTransactionWithCounterpart,
} from "@/server/domain/converters/income-converter";

describe("convertToIncomeSections", () => {
  it("converts raw transactions to all income sections", () => {
    const transactions: IncomeTransaction[] = [
      {
        transactionNo: "1",
        categoryKey: "publication-income",
        friendlyCategory: "機関紙発行",
        label: "機関紙",
        description: "機関紙発行収入",
        memo: null,
        debitAmount: 0,
        creditAmount: 120000,
      },
      {
        transactionNo: "2",
        categoryKey: "other-income",
        friendlyCategory: "その他の収入",
        label: "寄附金",
        description: "寄附金収入",
        memo: null,
        debitAmount: 0,
        creditAmount: 150000,
      },
      {
        transactionNo: "3",
        categoryKey: "other-income",
        friendlyCategory: "その他の収入",
        label: "少額収入",
        description: "10万円未満",
        memo: null,
        debitAmount: 0,
        creditAmount: 50000,
      },
    ];

    const { businessIncome, loanIncome, grantIncome, otherIncome } =
      convertToIncomeSections({
        transactions,
        transactionsWithCounterpart: [],
      });

    // BusinessIncome (publication-income)
    expect(businessIncome.totalAmount).toBe(120000);
    expect(businessIncome.rows).toHaveLength(1);
    expect(businessIncome.rows[0].gigyouSyurui).toBe("機関紙発行");
    expect(businessIncome.rows[0].kingaku).toBe(120000);

    // LoanIncome (loan-income) - empty in this test
    expect(loanIncome.totalAmount).toBe(0);
    expect(loanIncome.rows).toHaveLength(0);

    // GrantIncome (grant-income) - empty in this test
    expect(grantIncome.totalAmount).toBe(0);
    expect(grantIncome.rows).toHaveLength(0);

    // OtherIncome (other-income)
    expect(otherIncome.totalAmount).toBe(200000);
    expect(otherIncome.underThresholdAmount).toBe(50000);
    expect(otherIncome.rows).toHaveLength(1);
    expect(otherIncome.rows[0].kingaku).toBe(150000);
  });

  it("classifies transactions without publication-income categoryKey as otherIncome", () => {
    const transactions: IncomeTransaction[] = [
      {
        transactionNo: "1",
        categoryKey: "other-income",
        friendlyCategory: "その他の収入",
        label: "雑収入",
        description: "雑収入",
        memo: null,
        debitAmount: 0,
        creditAmount: 80000,
      },
    ];

    const { businessIncome, otherIncome } = convertToIncomeSections({
      transactions,
      transactionsWithCounterpart: [],
    });

    expect(businessIncome.totalAmount).toBe(0);
    expect(businessIncome.rows).toHaveLength(0);
    expect(otherIncome.totalAmount).toBe(80000);
  });

  it("converts loan-income transactions to LoanIncomeSection", () => {
    const transactionsWithCounterpart: IncomeTransactionWithCounterpart[] = [
      {
        transactionNo: "1",
        categoryKey: "loan-income",
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

    const { loanIncome } = convertToIncomeSections({
      transactions: [],
      transactionsWithCounterpart,
    });

    expect(loanIncome.totalAmount).toBe(1000000);
    expect(loanIncome.rows).toHaveLength(1);
    expect(loanIncome.rows[0].kariiresaki).toBe("株式会社テスト銀行");
    expect(loanIncome.rows[0].kingaku).toBe(1000000);
  });

  it("converts grant-income transactions to GrantIncomeSection", () => {
    const transactionDate = new Date("2024-05-15");
    const transactionsWithCounterpart: IncomeTransactionWithCounterpart[] = [
      {
        transactionNo: "1",
        categoryKey: "grant-income",
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

    const { grantIncome } = convertToIncomeSections({
      transactions: [],
      transactionsWithCounterpart,
    });

    expect(grantIncome.totalAmount).toBe(500000);
    expect(grantIncome.rows).toHaveLength(1);
    expect(grantIncome.rows[0].honsibuNm).toBe("〇〇党本部");
    expect(grantIncome.rows[0].kingaku).toBe(500000);
    expect(grantIncome.rows[0].dt).toEqual(transactionDate);
    expect(grantIncome.rows[0].jimuAdr).toBe("東京都千代田区永田町1-1-1");
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

  it("sets underThresholdAmount to 0 when not applicable", () => {
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
    expect(section.underThresholdAmount).toBe(0);
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

