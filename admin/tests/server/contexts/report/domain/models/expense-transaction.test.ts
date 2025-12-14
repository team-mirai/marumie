import {
  UtilityExpenseSection,
  SuppliesExpenseSection,
  OfficeExpenseSection,
  type UtilityExpenseTransaction,
  type SuppliesExpenseTransaction,
  type OfficeExpenseTransaction,
} from "@/server/contexts/report/domain/models/expense-transaction";
import { resolveExpenseAmount } from "@/server/contexts/report/domain/models/transaction-utils";

describe("UtilityExpenseSection.fromTransactions", () => {
  it("converts empty transactions to empty section", () => {
    const result = UtilityExpenseSection.fromTransactions([]);

    expect(result).toEqual({
      totalAmount: 0,
      underThresholdAmount: 0,
      rows: [],
    });
  });

  it("converts single transaction above threshold", () => {
    const transactions: UtilityExpenseTransaction[] = [
      createUtilityTransaction({
        transactionNo: "1",
        debitAmount: 150000,
        transactionDate: new Date("2024-04-01"),
        counterpartName: "電力会社",
        counterpartAddress: "東京都千代田区",
      }),
    ];

    const result = UtilityExpenseSection.fromTransactions(transactions);

    expect(result.totalAmount).toBe(150000);
    expect(result.underThresholdAmount).toBe(0);
    expect(result.rows).toHaveLength(1);
    expect(result.rows[0]).toMatchObject({
      ichirenNo: "1",
      kingaku: 150000,
      nm: "電力会社",
      adr: "東京都千代田区",
    });
  });

  it("separates transactions by 100,000 yen threshold", () => {
    const transactions: UtilityExpenseTransaction[] = [
      createUtilityTransaction({
        transactionNo: "1",
        debitAmount: 150000,
      }),
      createUtilityTransaction({
        transactionNo: "2",
        debitAmount: 50000,
      }),
      createUtilityTransaction({
        transactionNo: "3",
        debitAmount: 100000,
      }),
      createUtilityTransaction({
        transactionNo: "4",
        debitAmount: 99999,
      }),
    ];

    const result = UtilityExpenseSection.fromTransactions(transactions);

    // Total includes all transactions
    expect(result.totalAmount).toBe(399999);
    // Only < 100,000 in underThreshold
    expect(result.underThresholdAmount).toBe(149999); // 50000 + 99999
    // Only >= 100,000 in rows
    expect(result.rows).toHaveLength(2);
    expect(result.rows[0].kingaku).toBe(150000);
    expect(result.rows[1].kingaku).toBe(100000);
  });

  it("rounds decimal amounts consistently in all fields", () => {
    const transactions: UtilityExpenseTransaction[] = [
      createUtilityTransaction({
        transactionNo: "1",
        debitAmount: 100000.5, // Rounds to 100001
      }),
      createUtilityTransaction({
        transactionNo: "2",
        debitAmount: 100000.4, // Rounds to 100000
      }),
      createUtilityTransaction({
        transactionNo: "3",
        debitAmount: 100000.3, // Rounds to 100000
      }),
    ];

    const result = UtilityExpenseSection.fromTransactions(transactions);

    // All amounts should be rounded
    expect(result.totalAmount).toBe(300001); // 100001 + 100000 + 100000
    expect(result.underThresholdAmount).toBe(0);
    expect(result.rows).toHaveLength(3);

    // Sum of kingaku should equal totalAmount
    const kingakuSum = result.rows.reduce((sum, row) => sum + row.kingaku, 0);
    expect(kingakuSum).toBe(result.totalAmount);
    expect(kingakuSum).toBe(300001);

    expect(result.rows[0].kingaku).toBe(100001);
    expect(result.rows[1].kingaku).toBe(100000);
    expect(result.rows[2].kingaku).toBe(100000);
  });

  it("rounds decimal amounts with under-threshold transactions", () => {
    const transactions: UtilityExpenseTransaction[] = [
      createUtilityTransaction({
        transactionNo: "1",
        debitAmount: 100000.5, // Rounds to 100001 (above threshold)
      }),
      createUtilityTransaction({
        transactionNo: "2",
        debitAmount: 50000.6, // Rounds to 50001 (under threshold)
      }),
      createUtilityTransaction({
        transactionNo: "3",
        debitAmount: 30000.4, // Rounds to 30000 (under threshold)
      }),
    ];

    const result = UtilityExpenseSection.fromTransactions(transactions);

    expect(result.totalAmount).toBe(180002); // 100001 + 50001 + 30000
    expect(result.underThresholdAmount).toBe(80001); // 50001 + 30000
    expect(result.rows).toHaveLength(1);

    // Sum of kingaku + underThresholdAmount should equal totalAmount
    const kingakuSum = result.rows.reduce((sum, row) => sum + row.kingaku, 0);
    expect(kingakuSum + result.underThresholdAmount).toBe(result.totalAmount);
  });
});

describe("SuppliesExpenseSection.fromTransactions", () => {
  it("converts supplies expense transactions", () => {
    const transactions: SuppliesExpenseTransaction[] = [
      createSuppliesTransaction({
        transactionNo: "1",
        debitAmount: 200000,
      }),
    ];

    const result = SuppliesExpenseSection.fromTransactions(transactions);

    expect(result.totalAmount).toBe(200000);
    expect(result.rows).toHaveLength(1);
  });

  it("rounds decimal amounts consistently", () => {
    const transactions: SuppliesExpenseTransaction[] = [
      createSuppliesTransaction({
        transactionNo: "1",
        debitAmount: 150000.75,
      }),
      createSuppliesTransaction({
        transactionNo: "2",
        debitAmount: 75000.25,
      }),
    ];

    const result = SuppliesExpenseSection.fromTransactions(transactions);

    expect(result.totalAmount).toBe(225001); // 150001 + 75000
    expect(result.underThresholdAmount).toBe(75000);
    expect(result.rows).toHaveLength(1);
    expect(result.rows[0].kingaku).toBe(150001);

    const kingakuSum = result.rows.reduce((sum, row) => sum + row.kingaku, 0);
    expect(kingakuSum + result.underThresholdAmount).toBe(result.totalAmount);
  });
});

describe("OfficeExpenseSection.fromTransactions", () => {
  it("converts office expense transactions", () => {
    const transactions: OfficeExpenseTransaction[] = [
      createOfficeTransaction({
        transactionNo: "1",
        debitAmount: 300000,
      }),
    ];

    const result = OfficeExpenseSection.fromTransactions(transactions);

    expect(result.totalAmount).toBe(300000);
    expect(result.rows).toHaveLength(1);
  });

  it("rounds decimal amounts consistently", () => {
    const transactions: OfficeExpenseTransaction[] = [
      createOfficeTransaction({
        transactionNo: "1",
        debitAmount: 120000.49, // Rounds to 120000
      }),
      createOfficeTransaction({
        transactionNo: "2",
        debitAmount: 80000.51, // Rounds to 80001
      }),
    ];

    const result = OfficeExpenseSection.fromTransactions(transactions);

    expect(result.totalAmount).toBe(200001); // 120000 + 80001
    expect(result.underThresholdAmount).toBe(80001);
    expect(result.rows).toHaveLength(1);
    expect(result.rows[0].kingaku).toBe(120000);

    const kingakuSum = result.rows.reduce((sum, row) => sum + row.kingaku, 0);
    expect(kingakuSum + result.underThresholdAmount).toBe(result.totalAmount);
  });
});

describe("resolveExpenseAmount", () => {
  it("uses debitAmount when positive", () => {
    expect(resolveExpenseAmount(100, 0)).toBe(100);
  });

  it("uses creditAmount when debitAmount is zero", () => {
    expect(resolveExpenseAmount(0, 200)).toBe(200);
  });

  it("uses creditAmount when debitAmount is negative", () => {
    expect(resolveExpenseAmount(-50, 200)).toBe(200);
  });

  it("returns 0 when both amounts are invalid", () => {
    expect(resolveExpenseAmount(0, 0)).toBe(0);
    expect(resolveExpenseAmount(NaN, NaN)).toBe(0);
  });
});

describe("expense field building", () => {
  it("builds mokuteki from friendlyCategory", () => {
    const transactions: UtilityExpenseTransaction[] = [
      createUtilityTransaction({
        transactionNo: "1",
        friendlyCategory: "電気料金",
        debitAmount: 150000,
      }),
    ];

    const result = UtilityExpenseSection.fromTransactions(transactions);

    expect(result.rows[0].mokuteki).toBe("電気料金");
  });

  it("builds bikou with transaction number", () => {
    const transactions: UtilityExpenseTransaction[] = [
      createUtilityTransaction({
        transactionNo: "12345",
        debitAmount: 150000,
      }),
    ];

    const result = UtilityExpenseSection.fromTransactions(transactions);

    expect(result.rows[0].bikou).toContain("MF行番号: 12345");
  });

  it("sanitizes text fields", () => {
    const transactions: UtilityExpenseTransaction[] = [
      createUtilityTransaction({
        transactionNo: "1",
        debitAmount: 150000,
        counterpartName: "  電力  会社  ",
        counterpartAddress: "東京都   千代田区",
      }),
    ];

    const result = UtilityExpenseSection.fromTransactions(transactions);

    expect(result.rows[0].nm).toBe("電力 会社");
    expect(result.rows[0].adr).toBe("東京都 千代田区");
  });
});

// Factory functions for test data
function createUtilityTransaction(
  overrides: Partial<UtilityExpenseTransaction> = {},
): UtilityExpenseTransaction {
  return {
    transactionNo: "1",
    friendlyCategory: "光熱水費",
    label: null,
    description: null,
    memo: null,
    debitAmount: 100000,
    creditAmount: 0,
    transactionDate: new Date("2024-01-01"),
    counterpartName: "取引先",
    counterpartAddress: "東京都",
    ...overrides,
  };
}

function createSuppliesTransaction(
  overrides: Partial<SuppliesExpenseTransaction> = {},
): SuppliesExpenseTransaction {
  return {
    transactionNo: "1",
    friendlyCategory: "備品・消耗品費",
    label: null,
    description: null,
    memo: null,
    debitAmount: 100000,
    creditAmount: 0,
    transactionDate: new Date("2024-01-01"),
    counterpartName: "取引先",
    counterpartAddress: "東京都",
    ...overrides,
  };
}

function createOfficeTransaction(
  overrides: Partial<OfficeExpenseTransaction> = {},
): OfficeExpenseTransaction {
  return {
    transactionNo: "1",
    friendlyCategory: "事務所費",
    label: null,
    description: null,
    memo: null,
    debitAmount: 100000,
    creditAmount: 0,
    transactionDate: new Date("2024-01-01"),
    counterpartName: "取引先",
    counterpartAddress: "東京都",
    ...overrides,
  };
}
