import {
  DonationAssembler,
  type DonationAssemblerInput,
} from "@/server/contexts/report/application/services/donation-assembler";
import type { IReportTransactionRepository } from "@/server/contexts/report/domain/repositories/report-transaction-repository.interface";
import type { PersonalDonationTransaction } from "@/server/contexts/report/domain/models/donation-transaction";

describe("DonationAssembler", () => {
  let assembler: DonationAssembler;
  let mockRepository: jest.Mocked<IReportTransactionRepository>;

  const defaultInput: DonationAssemblerInput = {
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
      findTransactionsWithCounterparts: jest.fn(),
    };
    assembler = new DonationAssembler(mockRepository);
  });

  describe("リポジトリへのフィルター受け渡し", () => {
    it("正しいフィルターを渡す", async () => {
      mockRepository.findPersonalDonationTransactions.mockResolvedValue([]);

      const input: DonationAssemblerInput = {
        politicalOrganizationId: "org-456",
        financialYear: 2023,
      };

      await assembler.assemble(input);

      expect(mockRepository.findPersonalDonationTransactions).toHaveBeenCalledWith({
        politicalOrganizationId: "org-456",
        financialYear: 2023,
      });
    });
  });

  describe("セクション構築の委譲", () => {
    it("取得したトランザクションを個人寄附セクションに正しく委譲する", async () => {
      const transactions: PersonalDonationTransaction[] = [
        createDonationTransaction({ debitAmount: 100000 }),
        createDonationTransaction({ debitAmount: 50000 }),
      ];
      mockRepository.findPersonalDonationTransactions.mockResolvedValue(transactions);

      const result = await assembler.assemble(defaultInput);

      expect(result.personalDonations.totalAmount).toBe(150000);
      expect(result.personalDonations.rows).toHaveLength(2);
    });

    it("空のトランザクションの場合は空のセクションを返す", async () => {
      mockRepository.findPersonalDonationTransactions.mockResolvedValue([]);

      const result = await assembler.assemble(defaultInput);

      expect(result.personalDonations.totalAmount).toBe(0);
      expect(result.personalDonations.rows).toHaveLength(0);
      expect(result.personalDonations.sonotaGk).toBe(0);
    });

    it("DonationDataの全プロパティを含む結果を返す", async () => {
      mockRepository.findPersonalDonationTransactions.mockResolvedValue([]);

      const result = await assembler.assemble(defaultInput);

      expect(result).toHaveProperty("personalDonations");
      expect(result.personalDonations).toHaveProperty("totalAmount");
      expect(result.personalDonations).toHaveProperty("sonotaGk");
      expect(result.personalDonations).toHaveProperty("rows");
    });
  });

  describe("リポジトリエラーの伝播", () => {
    it("リポジトリがエラーを投げた場合は例外を伝播する", async () => {
      const error = new Error("Database connection failed");
      mockRepository.findPersonalDonationTransactions.mockRejectedValue(error);

      await expect(assembler.assemble(defaultInput)).rejects.toThrow("Database connection failed");
    });
  });
});

function createDonationTransaction(
  overrides: Partial<PersonalDonationTransaction> = {},
): PersonalDonationTransaction {
  return {
    transactionNo: "TX-001",
    transactionDate: new Date("2024-04-01"),
    debitAmount: 0,
    creditAmount: 0,
    memo: null,
    donorName: "テスト寄附者",
    donorAddress: "東京都千代田区",
    donorOccupation: "会社員",
    ...overrides,
  };
}
