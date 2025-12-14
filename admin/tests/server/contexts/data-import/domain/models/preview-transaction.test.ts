import { PreviewTransaction } from "@/server/contexts/data-import/domain/models/preview-transaction";

// モックデータの作成用ヘルパー
const createMockPreviewTransaction = (overrides: Partial<PreviewTransaction> = {}): PreviewTransaction => ({
  political_organization_id: "org-1",
  transaction_no: "T001",
  transaction_date: new Date("2025-08-15"),
  transaction_type: "expense",
  debit_account: "政治活動費",
  debit_sub_account: undefined,
  debit_amount: 100000,
  credit_account: "現金",
  credit_sub_account: undefined,
  credit_amount: 100000,
  description: undefined,
  label: undefined,
  friendly_category: "支出",
  category_key: "political-activity",
  hash: "",
  status: "insert",
  errors: [],
  ...overrides,
});

describe("PreviewTransaction.generateHash", () => {
  const testCases: Array<{
    description: string;
    input: Partial<PreviewTransaction>;
    shouldBeSame?: boolean;
    compareWith?: Partial<PreviewTransaction>;
  }> = [
    {
      description: "basic transaction data",
      input: {
        transaction_no: "T001",
        transaction_date: new Date("2025-08-15"),
        debit_account: "政治活動費",
        debit_amount: 100000,
        credit_account: "現金",
        credit_amount: 100000,
      },
    },
    {
      description: "transaction with sub accounts",
      input: {
        debit_sub_account: "サブ勘定1",
        credit_sub_account: "サブ勘定2",
      },
    },
    {
      description: "transaction with description",
      input: {
        description: "テスト取引の説明",
      },
    },
  ];

  it.each(testCases)("should generate hash for $description", ({ input }) => {
    const transaction = createMockPreviewTransaction(input);
    const hash = PreviewTransaction.generateHash(transaction);

    expect(hash).toMatch(/^[a-f0-9]{64}$/);
    expect(hash.length).toBe(64);
  });

  it("should generate same hash for identical data", () => {
    const transaction1 = createMockPreviewTransaction();
    const transaction2 = createMockPreviewTransaction();

    const hash1 = PreviewTransaction.generateHash(transaction1);
    const hash2 = PreviewTransaction.generateHash(transaction2);

    expect(hash1).toBe(hash2);
  });

  const differentDataCases: Array<{
    description: string;
    input1: Partial<PreviewTransaction>;
    input2: Partial<PreviewTransaction>;
  }> = [
    {
      description: "different transaction_no",
      input1: { transaction_no: "T001" },
      input2: { transaction_no: "T002" },
    },
    {
      description: "different transaction_date",
      input1: { transaction_date: new Date("2025-08-15") },
      input2: { transaction_date: new Date("2025-08-16") },
    },
    {
      description: "different debit_amount",
      input1: { debit_amount: 100000 },
      input2: { debit_amount: 200000 },
    },
    {
      description: "different accounts",
      input1: { debit_account: "政治活動費" },
      input2: { debit_account: "組織活動費" },
    },
  ];

  it.each(differentDataCases)("should generate different hash for $description", ({ input1, input2 }) => {
    const transaction1 = createMockPreviewTransaction(input1);
    const transaction2 = createMockPreviewTransaction(input2);

    const hash1 = PreviewTransaction.generateHash(transaction1);
    const hash2 = PreviewTransaction.generateHash(transaction2);

    expect(hash1).not.toBe(hash2);
  });

  it("should ignore non-hash fields", () => {
    const base = createMockPreviewTransaction();
    const withDifferentFields = createMockPreviewTransaction({
      political_organization_id: "different-org",
      label: "different label",
      friendly_category: "different category",
      status: "update",
      errors: ["some error"],
      hash: "different-hash",
    });

    const hash1 = PreviewTransaction.generateHash(base);
    const hash2 = PreviewTransaction.generateHash(withDifferentFields);

    expect(hash1).toBe(hash2);
  });

  it("should handle undefined optional fields consistently", () => {
    const withUndefined = createMockPreviewTransaction({
      debit_sub_account: undefined,
      credit_sub_account: undefined,
      description: undefined,
    });
    const withEmptyString = createMockPreviewTransaction({
      debit_sub_account: "",
      credit_sub_account: "",
      description: "",
    });

    const hash1 = PreviewTransaction.generateHash(withUndefined);
    const hash2 = PreviewTransaction.generateHash(withEmptyString);

    expect(hash1).toBe(hash2);
  });

  const dateTestCases: Array<{
    description: string;
    date: Date | string;
    expectError?: boolean;
  }> = [
    {
      description: "Date object",
      date: new Date("2025-08-15T10:30:00Z"),
    },
    {
      description: "valid date string",
      date: "2025-08-15",
    },
    {
      description: "invalid date string",
      date: "invalid-date",
      expectError: true,
    },
    {
      description: "invalid Date object",
      date: new Date("invalid"),
      expectError: true,
    },
  ];

  it.each(dateTestCases.filter(tc => !tc.expectError))("should handle $description", ({ date }) => {
    const transaction = createMockPreviewTransaction({ transaction_date: date as Date });
    const hash = PreviewTransaction.generateHash(transaction);

    expect(hash).toMatch(/^[a-f0-9]{64}$/);
  });

  it.each(dateTestCases.filter(tc => tc.expectError))("should throw error for $description", ({ date }) => {
    const transaction = createMockPreviewTransaction({ transaction_date: date as Date });

    expect(() => PreviewTransaction.generateHash(transaction)).toThrow("Invalid");
  });

  it("should normalize dates to same hash regardless of time", () => {
    const morning = createMockPreviewTransaction({
      transaction_date: new Date("2025-08-15T08:00:00Z"),
    });
    const evening = createMockPreviewTransaction({
      transaction_date: new Date("2025-08-15T20:00:00Z"),
    });

    const hash1 = PreviewTransaction.generateHash(morning);
    const hash2 = PreviewTransaction.generateHash(evening);

    expect(hash1).toBe(hash2);
  });
});

describe("PreviewTransaction.extractFinancialYear", () => {
  it("should return correct financial year for calendar year dates", () => {
    expect(PreviewTransaction.extractFinancialYear(new Date("2025/1/1"))).toBe(2025);
    expect(PreviewTransaction.extractFinancialYear(new Date("2025/3/31"))).toBe(2025);
    expect(PreviewTransaction.extractFinancialYear(new Date("2025/6/15"))).toBe(2025);
    expect(PreviewTransaction.extractFinancialYear(new Date("2025/12/31"))).toBe(2025);
  });
});