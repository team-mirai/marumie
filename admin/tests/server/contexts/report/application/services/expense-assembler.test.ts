import {
  ExpenseAssembler,
  type ExpenseAssemblerInput,
} from "@/server/contexts/report/application/services/expense-assembler";
import type { IReportTransactionRepository } from "@/server/contexts/report/domain/repositories/report-transaction-repository.interface";
import type { UtilityExpenseTransaction } from "@/server/contexts/report/domain/models/expense-transaction";

/**
 * ExpenseAssembler のテスト
 *
 * アセンブラの責務:
 * 1. リポジトリから13種類の経費トランザクションを並列取得
 * 2. 取得したトランザクションを各ドメインモデルに委譲してセクションを構築
 *
 * 注: 閾値ロジック（10万円/5万円）や金額計算はドメインモデルの責務であり、
 * expense-transaction.test.ts でテスト済み
 */
describe("ExpenseAssembler", () => {
  let assembler: ExpenseAssembler;
  let mockRepository: jest.Mocked<IReportTransactionRepository>;

  const defaultInput: ExpenseAssemblerInput = {
    politicalOrganizationId: "org-123",
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
          findOrganizationExpenseTransactions: jest.fn(),
          findElectionExpenseTransactions: jest.fn(),
          findPublicationExpenseTransactions: jest.fn(),
          findAdvertisingExpenseTransactions: jest.fn(),
          findFundraisingPartyExpenseTransactions: jest.fn(),
          findOtherBusinessExpenseTransactions: jest.fn(),
          findResearchExpenseTransactions: jest.fn(),
          findDonationGrantExpenseTransactions: jest.fn(),
          findOtherPoliticalExpenseTransactions: jest.fn(),
          findPersonnelExpenseTransactions: jest.fn(),
          findTransactionsWithCounterparts: jest.fn(),
          findByCounterpart: jest.fn(),
          existsById: jest.fn(),
          findExistingIds: jest.fn(),
          findByIdWithCounterpart: jest.fn(),
          updateGrantExpenditureFlag: jest.fn(),
        };
    assembler = new ExpenseAssembler(mockRepository);
  });

  function setupEmptyMocks() {
    mockRepository.findUtilityExpenseTransactions.mockResolvedValue([]);
    mockRepository.findSuppliesExpenseTransactions.mockResolvedValue([]);
    mockRepository.findOfficeExpenseTransactions.mockResolvedValue([]);
    mockRepository.findOrganizationExpenseTransactions.mockResolvedValue([]);
    mockRepository.findElectionExpenseTransactions.mockResolvedValue([]);
    mockRepository.findPublicationExpenseTransactions.mockResolvedValue([]);
    mockRepository.findAdvertisingExpenseTransactions.mockResolvedValue([]);
    mockRepository.findFundraisingPartyExpenseTransactions.mockResolvedValue([]);
    mockRepository.findOtherBusinessExpenseTransactions.mockResolvedValue([]);
    mockRepository.findResearchExpenseTransactions.mockResolvedValue([]);
    mockRepository.findDonationGrantExpenseTransactions.mockResolvedValue([]);
    mockRepository.findOtherPoliticalExpenseTransactions.mockResolvedValue([]);
    mockRepository.findPersonnelExpenseTransactions.mockResolvedValue([]);
  }

  describe("リポジトリへのフィルター受け渡し", () => {
    it("全13メソッドに正しいフィルターを渡す", async () => {
      setupEmptyMocks();

      const input: ExpenseAssemblerInput = {
        politicalOrganizationId: "org-456",
        financialYear: 2023,
      };

      await assembler.assemble(input);

      const expectedFilters = {
        politicalOrganizationId: "org-456",
        financialYear: 2023,
      };

      // 経常経費
      expect(mockRepository.findUtilityExpenseTransactions).toHaveBeenCalledWith(expectedFilters);
      expect(mockRepository.findSuppliesExpenseTransactions).toHaveBeenCalledWith(expectedFilters);
      expect(mockRepository.findOfficeExpenseTransactions).toHaveBeenCalledWith(expectedFilters);

      // 政治活動費
      expect(mockRepository.findOrganizationExpenseTransactions).toHaveBeenCalledWith(
        expectedFilters,
      );
      expect(mockRepository.findElectionExpenseTransactions).toHaveBeenCalledWith(expectedFilters);
      expect(mockRepository.findPublicationExpenseTransactions).toHaveBeenCalledWith(
        expectedFilters,
      );
      expect(mockRepository.findAdvertisingExpenseTransactions).toHaveBeenCalledWith(
        expectedFilters,
      );
      expect(mockRepository.findFundraisingPartyExpenseTransactions).toHaveBeenCalledWith(
        expectedFilters,
      );
      expect(mockRepository.findOtherBusinessExpenseTransactions).toHaveBeenCalledWith(
        expectedFilters,
      );
      expect(mockRepository.findResearchExpenseTransactions).toHaveBeenCalledWith(expectedFilters);
      expect(mockRepository.findDonationGrantExpenseTransactions).toHaveBeenCalledWith(
        expectedFilters,
      );
      expect(mockRepository.findOtherPoliticalExpenseTransactions).toHaveBeenCalledWith(
        expectedFilters,
      );

      // 人件費
      expect(mockRepository.findPersonnelExpenseTransactions).toHaveBeenCalledWith(expectedFilters);
    });
  });

  describe("並列フェッチ", () => {
    it("13種類のトランザクションを並列で取得する", async () => {
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

      // 各メソッドに異なる遅延を設定
      mockRepository.findUtilityExpenseTransactions = createDelayedMock("utility", 50);
      mockRepository.findSuppliesExpenseTransactions = createDelayedMock("supplies", 10);
      mockRepository.findOfficeExpenseTransactions = createDelayedMock("office", 30);
      mockRepository.findOrganizationExpenseTransactions = createDelayedMock("organization", 20);
      mockRepository.findElectionExpenseTransactions = createDelayedMock("election", 15);
      mockRepository.findPublicationExpenseTransactions = createDelayedMock("publication", 25);
      mockRepository.findAdvertisingExpenseTransactions = createDelayedMock("advertising", 35);
      mockRepository.findFundraisingPartyExpenseTransactions = createDelayedMock(
        "fundraisingParty",
        40,
      );
      mockRepository.findOtherBusinessExpenseTransactions = createDelayedMock("otherBusiness", 5);
      mockRepository.findResearchExpenseTransactions = createDelayedMock("research", 45);
      mockRepository.findDonationGrantExpenseTransactions = createDelayedMock("donationGrant", 55);
      mockRepository.findOtherPoliticalExpenseTransactions = createDelayedMock(
        "otherPolitical",
        60,
      );
      mockRepository.findPersonnelExpenseTransactions = createDelayedMock("personnel", 65);

      await assembler.assemble(defaultInput);

      // 全13メソッドが呼ばれたことを確認
      expect(callOrder).toHaveLength(13);

      // 並列実行されていれば、完了順は遅延時間順になる（呼び出し順ではない）
      expect(callOrder[0]).toBe("otherBusiness"); // 5ms
      expect(callOrder[1]).toBe("supplies"); // 10ms
      expect(callOrder[11]).toBe("otherPolitical"); // 60ms
    });
  });

  describe("セクション構築の委譲", () => {
    it("取得したトランザクションを各セクションに正しく委譲する", async () => {
      setupEmptyMocks();

      const utilityTx = [createExpenseTransaction({ debitAmount: 100000 })];
      const suppliesTx = [createExpenseTransaction({ debitAmount: 120000 })];
      const officeTx = [createExpenseTransaction({ debitAmount: 150000 })];

      mockRepository.findUtilityExpenseTransactions.mockResolvedValue(utilityTx);
      mockRepository.findSuppliesExpenseTransactions.mockResolvedValue(suppliesTx);
      mockRepository.findOfficeExpenseTransactions.mockResolvedValue(officeTx);

      const result = await assembler.assemble(defaultInput);

      // 各セクションにトランザクションデータが反映されていることを確認
      expect(result.utilityExpenses.totalAmount).toBe(100000);
      expect(result.suppliesExpenses.totalAmount).toBe(120000);
      expect(result.officeExpenses.totalAmount).toBe(150000);
    });

    it("空のトランザクションの場合は空のセクションを返す", async () => {
      setupEmptyMocks();

      const result = await assembler.assemble(defaultInput);

      // 経常経費
      expect(result.utilityExpenses.totalAmount).toBe(0);
      expect(result.utilityExpenses.rows).toHaveLength(0);
      expect(result.suppliesExpenses.totalAmount).toBe(0);
      expect(result.officeExpenses.totalAmount).toBe(0);

      // 政治活動費（配列で返される）
      expect(result.organizationExpenses).toHaveLength(0);
      expect(result.electionExpenses).toHaveLength(0);
      expect(result.publicationExpenses).toHaveLength(0);
      expect(result.advertisingExpenses).toHaveLength(0);
      expect(result.fundraisingPartyExpenses).toHaveLength(0);
      expect(result.otherBusinessExpenses).toHaveLength(0);
      expect(result.researchExpenses).toHaveLength(0);
      expect(result.donationGrantExpenses).toHaveLength(0);
      expect(result.otherPoliticalExpenses).toHaveLength(0);
    });

    it("全13種類のセクションを含むExpenseDataを返す", async () => {
      setupEmptyMocks();

      const result = await assembler.assemble(defaultInput);

      // ExpenseDataの全プロパティが存在することを確認
      expect(result).toHaveProperty("personnelExpenses");
      expect(result).toHaveProperty("utilityExpenses");
      expect(result).toHaveProperty("suppliesExpenses");
      expect(result).toHaveProperty("officeExpenses");
      expect(result).toHaveProperty("organizationExpenses");
      expect(result).toHaveProperty("electionExpenses");
      expect(result).toHaveProperty("publicationExpenses");
      expect(result).toHaveProperty("advertisingExpenses");
      expect(result).toHaveProperty("fundraisingPartyExpenses");
      expect(result).toHaveProperty("otherBusinessExpenses");
      expect(result).toHaveProperty("researchExpenses");
      expect(result).toHaveProperty("donationGrantExpenses");
      expect(result).toHaveProperty("otherPoliticalExpenses");
    });
  });

  describe("リポジトリエラーの伝播", () => {
    it("リポジトリがエラーを投げた場合は例外を伝播する", async () => {
      setupEmptyMocks();
      const error = new Error("Database connection failed");
      mockRepository.findUtilityExpenseTransactions.mockRejectedValue(error);

      await expect(assembler.assemble(defaultInput)).rejects.toThrow("Database connection failed");
    });
  });
});

// ============================================================
// Factory function
// ============================================================

function createExpenseTransaction(
  overrides: Partial<UtilityExpenseTransaction> = {},
): UtilityExpenseTransaction {
  return {
    transactionNo: "TX-001",
    friendlyCategory: "経費",
    label: null,
    description: null,
    memo: null,
    debitAmount: 0,
    creditAmount: 0,
    transactionDate: new Date("2024-04-01"),
    counterpartName: "テスト支払先",
    counterpartAddress: "東京都千代田区",
    isGrantExpenditure: false,
    ...overrides,
  };
}
