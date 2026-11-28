import { Transaction } from "@/shared/models/transaction";
import {
  getCategoryMapping,
  convertToDisplayTransaction,
  convertToDisplayTransactions,
  formatYearMonth,
  calculateDisplayAmount,
  readTransactionAsCashFlow,
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

describe("readTransactionAsCashFlow", () => {
  it("支出科目が借方にある仕訳は、支出の発生として読む", () => {
    const transaction = createMockTransaction({
      transaction_type: "expense",
      debit_account: "調査研究費",
      debit_amount: 960,
      credit_account: "仮払金",
      credit_amount: 960,
    });

    expect(readTransactionAsCashFlow(transaction)).toEqual({
      transactionType: "expense",
      account: "調査研究費",
      isReversal: false,
      netAmount: 960,
    });
  });

  it("支出科目が貸方にある仕訳（仮払金での返金）は、収入ではなく支出の戻しとして読む", () => {
    const transaction = createMockTransaction({
      transaction_type: "expense",
      debit_account: "仮払金",
      debit_amount: 714,
      credit_account: "調査研究費",
      credit_amount: 714,
    });

    expect(readTransactionAsCashFlow(transaction)).toEqual({
      transactionType: "expense",
      account: "調査研究費",
      isReversal: true,
      netAmount: -714,
    });
  });

  it("相手科目が普通預金で income として保存されていても、支出科目が貸方なら支出の戻しとして読む", () => {
    const transaction = createMockTransaction({
      transaction_type: "income",
      debit_account: "普通預金",
      debit_amount: 13640,
      credit_account: "組織活動費",
      credit_amount: 13640,
    });

    expect(readTransactionAsCashFlow(transaction)).toEqual({
      transactionType: "expense",
      account: "組織活動費",
      isReversal: true,
      netAmount: -13640,
    });
  });

  it("収入科目が貸方にある仕訳は、収入の発生として読む", () => {
    const transaction = createMockTransaction({
      transaction_type: "income",
      debit_account: "普通預金",
      debit_amount: 50000,
      credit_account: "個人からの寄附",
      credit_amount: 50000,
    });

    expect(readTransactionAsCashFlow(transaction)).toEqual({
      transactionType: "income",
      account: "個人からの寄附",
      isReversal: false,
      netAmount: 50000,
    });
  });

  it("収入科目が借方にある仕訳（寄附の返金）は、支出ではなく収入の戻しとして読む", () => {
    const transaction = createMockTransaction({
      transaction_type: "expense",
      debit_account: "個人からの寄附",
      debit_amount: 3000,
      credit_account: "普通預金",
      credit_amount: 3000,
    });

    expect(readTransactionAsCashFlow(transaction)).toEqual({
      transactionType: "income",
      account: "個人からの寄附",
      isReversal: true,
      netAmount: -3000,
    });
  });

  it("借方の借入金は収入の戻しではなく返済なので、支出の発生として読む", () => {
    const transaction = createMockTransaction({
      transaction_type: "expense",
      debit_account: "借入金",
      debit_amount: 200000,
      credit_account: "普通預金",
      credit_amount: 200000,
    });

    expect(readTransactionAsCashFlow(transaction)).toEqual({
      transactionType: "expense",
      account: "借入金",
      isReversal: false,
      netAmount: 200000,
    });
  });

  it("貸方の借入金（借入れ）は収入の発生として読む", () => {
    const transaction = createMockTransaction({
      transaction_type: "income",
      debit_account: "普通預金",
      debit_amount: 200000,
      credit_account: "借入金",
      credit_amount: 200000,
    });

    expect(readTransactionAsCashFlow(transaction)).toEqual({
      transactionType: "income",
      account: "借入金",
      isReversal: false,
      netAmount: 200000,
    });
  });

  it("収支科目がどちらの側にも無い仕訳は、保存済みの種別のとおりに読む", () => {
    const expense = createMockTransaction({
      transaction_type: "expense",
      debit_account: "科目マスタに無い科目",
      debit_amount: 100,
      credit_account: "普通預金",
      credit_amount: 100,
    });
    const income = createMockTransaction({
      transaction_type: "income",
      debit_account: "普通預金",
      debit_amount: 100,
      credit_account: "科目マスタに無い科目",
      credit_amount: 100,
    });

    expect(readTransactionAsCashFlow(expense)).toEqual({
      transactionType: "expense",
      account: "科目マスタに無い科目",
      isReversal: false,
      netAmount: 100,
    });
    expect(readTransactionAsCashFlow(income)).toEqual({
      transactionType: "income",
      account: "科目マスタに無い科目",
      isReversal: false,
      netAmount: 100,
    });
  });
});

describe("返金・取り消しの仕訳の表示", () => {
  it("支出の返金は「不明」ではなく元の支出科目のカテゴリーで、プラスの金額として表示する", () => {
    const result = convertToDisplayTransaction(
      createMockTransaction({
        transaction_type: "expense",
        debit_account: "仮払金",
        debit_amount: 714,
        credit_account: "調査研究費",
        credit_amount: 714,
        category_key: "research-expenses",
      }),
    );

    expect(result.transactionType).toBe("expense");
    expect(result.account).toBe("調査研究費");
    expect(result.shortLabel).toBe("調査研究費");
    expect(result.category).not.toBe("unknown");
    expect(result.absAmount).toBe(714);
    expect(result.amount).toBe(714);
  });

  it("収入の返金は元の収入科目のカテゴリーで、マイナスの金額として表示する", () => {
    const result = convertToDisplayTransaction(
      createMockTransaction({
        transaction_type: "expense",
        debit_account: "個人からの寄附",
        debit_amount: 3000,
        credit_account: "普通預金",
        credit_amount: 3000,
      }),
    );

    expect(result.transactionType).toBe("income");
    expect(result.account).toBe("個人からの寄附");
    expect(result.shortLabel).toBe("個人寄附");
    expect(result.absAmount).toBe(3000);
    expect(result.amount).toBe(-3000);
  });

  it("支出と同額の返金を足すと、表示金額の合計は 0 になる", () => {
    const [paid, refunded] = convertToDisplayTransactions([
      createMockTransaction({
        debit_account: "調査研究費",
        debit_amount: 714,
        credit_account: "仮払金",
        credit_amount: 714,
      }),
      createMockTransaction({
        debit_account: "仮払金",
        debit_amount: 714,
        credit_account: "調査研究費",
        credit_amount: 714,
      }),
    ]);

    expect(paid.amount + refunded.amount).toBe(0);
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
    // 絞り込みの照合に使うので、保存済みの category_key をそのまま持ち越す
    expect(result.categoryKey).toBe(transaction.category_key);
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
