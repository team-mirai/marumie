import {
  IncomeAssembler,
  type IncomeAssemblerInput,
} from "@/server/contexts/report/application/services/income-assembler";
import type { IReportTransactionRepository } from "@/server/contexts/report/infrastructure/repositories/interfaces/report-transaction-repository.interface";
import type {
  BusinessIncomeTransaction,
  GrantIncomeTransaction,
  LoanIncomeTransaction,
  OtherIncomeTransaction,
} from "@/server/contexts/report/domain/models/income-converter";

describe("IncomeAssembler", () => {
  let assembler: IncomeAssembler;
  let mockRepository: jest.Mocked<IReportTransactionRepository>;

  const defaultInput: IncomeAssemblerInput = {
    politicalOrganizationId: "123",
    financialYear: 2024,
  };

  beforeEach(() => {
    mockRepository = {
      findPersonalDonationTransactions: jest.fn(),
      findBusinessIncomeTransactions: jest.fn(),
      findLoanIncomeTransactions: jest.fn(),
      findGrantIncomeTransactions: jest.fn(),
      findOtherIncomeTransactions: jest.fn(),
      findUtilityExpenseTransactions: jest.fn(),
      findSuppliesExpenseTransactions: jest.fn(),
      findOfficeExpenseTransactions: jest.fn(),
    };
    assembler = new IncomeAssembler(mockRepository);
  });

  describe("assemble - happy path", () => {
    it("assembles all income sections from repository data", async () => {
      const businessTx: BusinessIncomeTransaction[] = [
        createBusinessTransaction({ creditAmount: 100000 }),
      ];
      const loanTx: LoanIncomeTransaction[] = [
        createLoanTransaction({ creditAmount: 500000 }),
      ];
      const grantTx: GrantIncomeTransaction[] = [
        createGrantTransaction({ creditAmount: 200000 }),
      ];
      const otherTx: OtherIncomeTransaction[] = [
        createOtherTransaction({ creditAmount: 150000 }),
      ];

      mockRepository.findBusinessIncomeTransactions.mockResolvedValue(
        businessTx,
      );
      mockRepository.findLoanIncomeTransactions.mockResolvedValue(loanTx);
      mockRepository.findGrantIncomeTransactions.mockResolvedValue(grantTx);
      mockRepository.findOtherIncomeTransactions.mockResolvedValue(otherTx);

      const result = await assembler.assemble(defaultInput);

      expect(result.businessIncome.totalAmount).toBe(100000);
      expect(result.businessIncome.rows).toHaveLength(1);
      expect(result.loanIncome.totalAmount).toBe(500000);
      expect(result.loanIncome.rows).toHaveLength(1);
      expect(result.grantIncome.totalAmount).toBe(200000);
      expect(result.grantIncome.rows).toHaveLength(1);
      expect(result.otherIncome.totalAmount).toBe(150000);
      expect(result.otherIncome.rows).toHaveLength(1);
    });

    it("returns empty sections when no transactions exist", async () => {
      mockRepository.findBusinessIncomeTransactions.mockResolvedValue([]);
      mockRepository.findLoanIncomeTransactions.mockResolvedValue([]);
      mockRepository.findGrantIncomeTransactions.mockResolvedValue([]);
      mockRepository.findOtherIncomeTransactions.mockResolvedValue([]);

      const result = await assembler.assemble(defaultInput);

      expect(result.businessIncome).toEqual({ totalAmount: 0, rows: [] });
      expect(result.loanIncome).toEqual({ totalAmount: 0, rows: [] });
      expect(result.grantIncome).toEqual({ totalAmount: 0, rows: [] });
      expect(result.otherIncome).toEqual({
        totalAmount: 0,
        underThresholdAmount: 0,
        rows: [],
      });
    });
  });

  describe("assemble - repository integration", () => {
    it("passes correct filters to all repository methods", async () => {
      mockRepository.findBusinessIncomeTransactions.mockResolvedValue([]);
      mockRepository.findLoanIncomeTransactions.mockResolvedValue([]);
      mockRepository.findGrantIncomeTransactions.mockResolvedValue([]);
      mockRepository.findOtherIncomeTransactions.mockResolvedValue([]);

      const input: IncomeAssemblerInput = {
        politicalOrganizationId: "456",
        financialYear: 2023,
      };

      await assembler.assemble(input);

      const expectedFilters = {
        politicalOrganizationId: "456",
        financialYear: 2023,
      };
      expect(
        mockRepository.findBusinessIncomeTransactions,
      ).toHaveBeenCalledWith(expectedFilters);
      expect(mockRepository.findLoanIncomeTransactions).toHaveBeenCalledWith(
        expectedFilters,
      );
      expect(mockRepository.findGrantIncomeTransactions).toHaveBeenCalledWith(
        expectedFilters,
      );
      expect(mockRepository.findOtherIncomeTransactions).toHaveBeenCalledWith(
        expectedFilters,
      );
    });

    it("fetches all transaction types in parallel", async () => {
      const callOrder: string[] = [];
      const createDelayedMock = (name: string, delay: number) =>
        jest.fn().mockImplementation(
          () =>
            new Promise((resolve) => {
              setTimeout(() => {
                callOrder.push(name);
                resolve([]);
              }, delay);
            }),
        );

      mockRepository.findBusinessIncomeTransactions = createDelayedMock(
        "business",
        30,
      );
      mockRepository.findLoanIncomeTransactions = createDelayedMock("loan", 10);
      mockRepository.findGrantIncomeTransactions = createDelayedMock(
        "grant",
        20,
      );
      mockRepository.findOtherIncomeTransactions = createDelayedMock(
        "other",
        5,
      );

      await assembler.assemble(defaultInput);

      // All methods should be called (order depends on delay, not call sequence)
      expect(callOrder).toHaveLength(4);
      expect(callOrder).toContain("business");
      expect(callOrder).toContain("loan");
      expect(callOrder).toContain("grant");
      expect(callOrder).toContain("other");
    });
  });

  describe("assemble - otherIncome threshold logic", () => {
    it("separates transactions by 100,000 yen threshold", async () => {
      mockRepository.findBusinessIncomeTransactions.mockResolvedValue([]);
      mockRepository.findLoanIncomeTransactions.mockResolvedValue([]);
      mockRepository.findGrantIncomeTransactions.mockResolvedValue([]);
      mockRepository.findOtherIncomeTransactions.mockResolvedValue([
        createOtherTransaction({ creditAmount: 150000, transactionNo: "1" }),
        createOtherTransaction({ creditAmount: 99999, transactionNo: "2" }),
        createOtherTransaction({ creditAmount: 100000, transactionNo: "3" }),
        createOtherTransaction({ creditAmount: 50000, transactionNo: "4" }),
      ]);

      const result = await assembler.assemble(defaultInput);

      // Total includes all transactions
      expect(result.otherIncome.totalAmount).toBe(399999);
      // Only >= 100,000 appear in rows
      expect(result.otherIncome.rows).toHaveLength(2);
      expect(result.otherIncome.rows[0].kingaku).toBe(150000);
      expect(result.otherIncome.rows[1].kingaku).toBe(100000);
      // Under threshold amount is sum of < 100,000
      expect(result.otherIncome.underThresholdAmount).toBe(149999);
    });
  });
});

// Factory functions for test data
function createBusinessTransaction(
  overrides: Partial<BusinessIncomeTransaction> = {},
): BusinessIncomeTransaction {
  return {
    transactionNo: "1",
    friendlyCategory: "事業収入",
    label: null,
    description: null,
    memo: null,
    debitAmount: 0,
    creditAmount: 0,
    ...overrides,
  };
}

function createLoanTransaction(
  overrides: Partial<LoanIncomeTransaction> = {},
): LoanIncomeTransaction {
  return {
    transactionNo: "1",
    friendlyCategory: "借入金",
    label: null,
    description: null,
    memo: null,
    debitAmount: 0,
    creditAmount: 0,
    transactionDate: new Date("2024-04-01"),
    counterpartName: "テスト銀行",
    counterpartAddress: "東京都千代田区",
    ...overrides,
  };
}

function createGrantTransaction(
  overrides: Partial<GrantIncomeTransaction> = {},
): GrantIncomeTransaction {
  return {
    transactionNo: "1",
    friendlyCategory: "交付金",
    label: null,
    description: null,
    memo: null,
    debitAmount: 0,
    creditAmount: 0,
    transactionDate: new Date("2024-05-01"),
    counterpartName: "本部",
    counterpartAddress: "東京都千代田区",
    ...overrides,
  };
}

function createOtherTransaction(
  overrides: Partial<OtherIncomeTransaction> = {},
): OtherIncomeTransaction {
  return {
    transactionNo: "1",
    friendlyCategory: "その他",
    label: null,
    description: null,
    memo: null,
    debitAmount: 0,
    creditAmount: 0,
    ...overrides,
  };
}
