import { Transaction } from "@/shared/models/transaction";
import {
  getCategoryMapping,
  convertToDisplayTransaction,
  convertToDisplayTransactions,
  formatYearMonth,
  getAccountFromTransaction,
  calculateDisplayAmount,
} from "@/server/contexts/public-finance/domain/models/display-transaction";
import { DisplayTransaction } from "@/server/contexts/public-finance/domain/models/display-transaction";

const createMockTransaction = (overrides: Partial<Transaction> = {}): Transaction => ({
  id: "test-id-1",
  political_organization_id: "org-1",
  transaction_no: "T001",
  transaction_date: new Date("2025-08-15"),
  financial_year: 2025,
  transaction_type: "expense",
  debit_account: "政治活動費",
  debit_amount: 100000,
  credit_account: "現金",
  credit_amount: 100000,
  friendly_category: "支出",
  category_key: "political-activity",
  label: "テスト取引",
  hash: "test-hash",
  created_at: new Date(),
  updated_at: new Date(),
  ...overrides,
});

describe("formatYearMonth", () => {
  it("should format date to YYYY.MM format", () => {
    expect(formatYearMonth(new Date("2025-08-15"))).toBe("2025.08");
  });

  it("should pad single digit month with zero", () => {
    expect(formatYearMonth(new Date("2025-01-05"))).toBe("2025.01");
  });

  it("should handle December correctly", () => {
    expect(formatYearMonth(new Date("2025-12-31"))).toBe("2025.12");
  });
});

describe("getAccountFromTransaction", () => {
  it("should return debit_account for expense transactions", () => {
    const transaction = createMockTransaction({
      transaction_type: "expense",
      debit_account: "政治活動費",
      credit_account: "現金",
    });
    expect(getAccountFromTransaction(transaction)).toBe("政治活動費");
  });

  it("should return credit_account for income transactions", () => {
    const transaction = createMockTransaction({
      transaction_type: "income",
      debit_account: "現金",
      credit_account: "個人からの寄附",
    });
    expect(getAccountFromTransaction(transaction)).toBe("個人からの寄附");
  });
});

describe("calculateDisplayAmount", () => {
  it("should return negative amount for expense transactions", () => {
    const transaction = createMockTransaction({
      transaction_type: "expense",
      debit_amount: 100000,
    });
    const result = calculateDisplayAmount(transaction);
    expect(result.absAmount).toBe(100000);
    expect(result.amount).toBe(-100000);
  });

  it("should return positive amount for income transactions", () => {
    const transaction = createMockTransaction({
      transaction_type: "income",
      credit_amount: 50000,
    });
    const result = calculateDisplayAmount(transaction);
    expect(result.absAmount).toBe(50000);
    expect(result.amount).toBe(50000);
  });

  it("should handle negative amounts correctly", () => {
    const transaction = createMockTransaction({
      transaction_type: "expense",
      debit_amount: -50000,
    });
    const result = calculateDisplayAmount(transaction);
    expect(result.absAmount).toBe(50000);
    expect(result.amount).toBe(-50000);
  });
});

describe("getCategoryMapping", () => {
  const testCases = [
    {
      description: "known account mapping",
      input: "個人からの寄附",
      expected: {
        category: "寄附",
        subcategory: "個人からの寄附",
        shortLabel: "個人寄附",
      },
    },
    {
      description: "unknown account fallback",
      input: "存在しないアカウント",
      expected: {
        category: "unknown",
        subcategory: "unknown",
        shortLabel: "不明",
        color: "#99F6E4",
      },
    },
  ];

  it.each(testCases)("should return $description", ({ input, expected }) => {
    const result = getCategoryMapping(input);
    expect(result).toMatchObject(expected);
  });
});

describe("convertToDisplayTransaction", () => {
  beforeEach(() => {
    jest.spyOn(console, "warn").mockImplementation(() => {});
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  const testCases: Array<{
    description: string;
    input: Partial<Transaction>;
    expected: Partial<DisplayTransaction>;
  }> = [
    {
      description: "expense transaction",
      input: {
        transaction_type: "expense",
        transaction_date: new Date("2025-08-15"),
        debit_account: "政治活動費",
        debit_amount: 100000,
        credit_account: "現金",
        credit_amount: 100000,
      },
      expected: {
        yearmonth: "2025.08",
        transactionType: "expense",
        account: "政治活動費",
        absAmount: 100000,
        amount: -100000,
      },
    },
    {
      description: "income transaction",
      input: {
        transaction_type: "income",
        transaction_date: new Date("2025-12-01"),
        debit_account: "現金",
        debit_amount: 50000,
        credit_account: "個人からの寄附",
        credit_amount: 50000,
      },
      expected: {
        yearmonth: "2025.12",
        transactionType: "income",
        account: "個人からの寄附",
        absAmount: 50000,
        amount: 50000,
      },
    },
    {
      description: "date formatting with single digit month",
      input: {
        transaction_date: new Date("2025-01-05"),
      },
      expected: {
        yearmonth: "2025.01",
      },
    },
    {
      description: "empty label handling",
      input: {
        label: "",
      },
      expected: {
        label: "",
      },
    },
  ];

  it.each(testCases)("should convert $description", ({ input, expected }) => {
    const transaction = createMockTransaction(input);
    const result = convertToDisplayTransaction(transaction);

    expect(result).toMatchObject(expected);
    expect(result.id).toBe(transaction.id);
    expect(result.date).toBe(transaction.transaction_date);
  });

  const offsetTestCases = [
    { type: "offset_income" as const, description: "offset_income" },
    { type: "offset_expense" as const, description: "offset_expense" },
  ];

  it.each(offsetTestCases)("should warn for $description transactions", ({ type }) => {
    const transaction = createMockTransaction({ transaction_type: type });

    convertToDisplayTransaction(transaction);

    expect(console.warn).toHaveBeenCalledWith(
      expect.stringContaining("offset（相殺取引）を直接表示することは想定されていません"),
    );
  });

  it("should handle negative amounts correctly", () => {
    const expenseTransaction = createMockTransaction({
      transaction_type: "expense",
      debit_amount: -50000,
    });

    const result = convertToDisplayTransaction(expenseTransaction);

    expect(result.absAmount).toBe(50000);
    expect(result.amount).toBe(-50000);
  });
});

describe("convertToDisplayTransactions", () => {
  it("should convert array of transactions", () => {
    const transactions = [
      createMockTransaction({ id: "1", debit_amount: 10000 }),
      createMockTransaction({ id: "2", debit_amount: 20000 }),
    ];

    const result = convertToDisplayTransactions(transactions);

    expect(result).toHaveLength(2);
    expect(result[0].id).toBe("1");
    expect(result[1].id).toBe("2");
  });

  it("should handle empty array", () => {
    const result = convertToDisplayTransactions([]);
    expect(result).toEqual([]);
  });
});
