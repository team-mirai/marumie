import {
  createEmptyPreviewStatistics,
  calculatePreviewStatistics,
  calculatePreviewSummary,
} from "@/server/contexts/data-import/domain/services/preview-stats-calculator";
import type { PreviewTransaction } from "@/server/contexts/data-import/domain/models/preview-transaction";

// モックデータの作成用ヘルパー
const createMockTransaction = (overrides: Partial<PreviewTransaction> = {}): PreviewTransaction => ({
  political_organization_id: "org-1",
  transaction_no: "T001",
  transaction_date: new Date("2025-08-15"),
  transaction_type: "expense",
  debit_account: "政治活動費",
  debit_sub_account: undefined,
  debit_amount: 10000,
  credit_account: "現金",
  credit_sub_account: undefined,
  credit_amount: 10000,
  description: undefined,
  label: undefined,
  friendly_category: "支出",
  category_key: "political-activity",
  hash: "test-hash",
  status: "insert",
  errors: [],
  ...overrides,
});

describe("createEmptyPreviewStatistics", () => {
  it("should create empty statistics with all counts and amounts zero", () => {
    const result = createEmptyPreviewStatistics();

    expect(result.insert.income).toEqual({ count: 0, amount: 0 });
    expect(result.insert.expense).toEqual({ count: 0, amount: 0 });
    expect(result.insert.non_cash_journal).toEqual({ count: 0, amount: 0 });
    expect(result.insert.offset_income).toEqual({ count: 0, amount: 0 });
    expect(result.insert.offset_expense).toEqual({ count: 0, amount: 0 });

    expect(result.update.income).toEqual({ count: 0, amount: 0 });
    expect(result.skip.income).toEqual({ count: 0, amount: 0 });
    expect(result.invalid.income).toEqual({ count: 0, amount: 0 });
  });
});

describe("calculatePreviewSummary", () => {
  const testCases = [
    {
      description: "empty array",
      input: [],
      expected: {
        totalCount: 0,
        insertCount: 0,
        updateCount: 0,
        invalidCount: 0,
        skipCount: 0,
      },
    },
    {
      description: "mixed statuses",
      input: [
        createMockTransaction({ status: "insert" }),
        createMockTransaction({ status: "update" }),
        createMockTransaction({ status: "invalid" }),
        createMockTransaction({ status: "skip" }),
      ],
      expected: {
        totalCount: 4,
        insertCount: 1,
        updateCount: 1,
        invalidCount: 1,
        skipCount: 1,
      },
    },
    {
      description: "multiple same status",
      input: [
        createMockTransaction({ status: "insert" }),
        createMockTransaction({ status: "insert" }),
        createMockTransaction({ status: "update" }),
      ],
      expected: {
        totalCount: 3,
        insertCount: 2,
        updateCount: 1,
        invalidCount: 0,
        skipCount: 0,
      },
    },
  ];

  it.each(testCases)("should calculate summary for $description", ({ input, expected }) => {
    const result = calculatePreviewSummary(input);
    expect(result).toEqual(expected);
  });
});

describe("calculatePreviewStatistics", () => {
  it("should calculate statistics for empty array", () => {
    const result = calculatePreviewStatistics([]);
    const empty = createEmptyPreviewStatistics();
    expect(result).toEqual(empty);
  });

  it("should calculate statistics for expense transactions", () => {
    const transactions = [
      createMockTransaction({
        status: "insert",
        transaction_type: "expense",
        debit_amount: 10000,
      }),
      createMockTransaction({
        status: "update",
        transaction_type: "expense",
        debit_amount: 20000,
      }),
    ];

    const result = calculatePreviewStatistics(transactions);

    expect(result.insert.expense).toEqual({ count: 1, amount: 10000 });
    expect(result.update.expense).toEqual({ count: 1, amount: 20000 });
    expect(result.insert.income).toEqual({ count: 0, amount: 0 });
  });

  it("should calculate statistics for income transactions", () => {
    const transactions = [
      createMockTransaction({
        status: "insert",
        transaction_type: "income",
        credit_amount: 50000,
      }),
    ];

    const result = calculatePreviewStatistics(transactions);

    expect(result.insert.income).toEqual({ count: 1, amount: 50000 });
    expect(result.insert.expense).toEqual({ count: 0, amount: 0 });
  });

  it("should handle different transaction types", () => {
    const transactions = [
      createMockTransaction({
        status: "insert",
        transaction_type: "income",
        credit_amount: 30000,
      }),
      createMockTransaction({
        status: "insert",
        transaction_type: "expense",
        debit_amount: 15000,
      }),
      createMockTransaction({
        status: "insert",
        transaction_type: "offset_income",
        credit_amount: 5000,
      }),
      createMockTransaction({
        status: "insert",
        transaction_type: "offset_expense",
        debit_amount: 8000,
      }),
    ];

    const result = calculatePreviewStatistics(transactions);

    expect(result.insert.income).toEqual({ count: 1, amount: 30000 });
    expect(result.insert.expense).toEqual({ count: 1, amount: 15000 });
    expect(result.insert.offset_income).toEqual({ count: 1, amount: 5000 });
    expect(result.insert.offset_expense).toEqual({ count: 1, amount: 8000 });
  });

  it("should skip transactions with null transaction_type", () => {
    const transactions = [
      createMockTransaction({
        status: "insert",
        transaction_type: null,
        debit_amount: 10000,
      }),
      createMockTransaction({
        status: "insert",
        transaction_type: "expense",
        debit_amount: 20000,
      }),
    ];

    const result = calculatePreviewStatistics(transactions);

    expect(result.insert.expense).toEqual({ count: 1, amount: 20000 });
    expect(result.insert.income).toEqual({ count: 0, amount: 0 });
  });
});