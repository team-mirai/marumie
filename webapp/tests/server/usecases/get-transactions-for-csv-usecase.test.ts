import { GetTransactionsForCsvUsecase } from "@/server/contexts/public-finance/application/usecases/get-transactions-for-csv-usecase";
import type { ITransactionRepository } from "@/server/contexts/public-finance/domain/repositories/transaction-repository.interface";
import type { IPoliticalOrganizationRepository } from "@/server/contexts/public-finance/domain/repositories/political-organization-repository.interface";
import type { Transaction } from "@/shared/models/transaction";

const createMockTransactionWithOrgName = (
  overrides: Partial<Transaction & { political_organization_name: string }> = {},
): Transaction & { political_organization_name: string } => ({
  id: "test-id-1",
  political_organization_id: "org-1",
  political_organization_name: "テスト組織",
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

const mockTransactionRepository = {
  findAllWithPoliticalOrganizationName: jest.fn(),
} as unknown as ITransactionRepository;

const mockPoliticalOrganizationRepository = {
  findBySlugs: jest.fn(),
} as unknown as IPoliticalOrganizationRepository;

describe("GetTransactionsForCsvUsecase", () => {
  let usecase: GetTransactionsForCsvUsecase;

  beforeEach(() => {
    jest.clearAllMocks();
    usecase = new GetTransactionsForCsvUsecase(
      mockTransactionRepository,
      mockPoliticalOrganizationRepository,
    );
  });

  it("should return transactions with organization name for valid organization", async () => {
    const mockOrganizations = [{ id: "1", slug: "test-org" }];
    const mockTransactions = [
      createMockTransactionWithOrgName({ id: "1", political_organization_name: "組織A" }),
      createMockTransactionWithOrgName({ id: "2", political_organization_name: "組織A" }),
    ];

    (mockPoliticalOrganizationRepository.findBySlugs as jest.Mock).mockResolvedValue(
      mockOrganizations,
    );
    (
      mockTransactionRepository.findAllWithPoliticalOrganizationName as jest.Mock
    ).mockResolvedValue(mockTransactions);

    const result = await usecase.execute({
      slugs: ["test-org"],
      financialYear: 2025,
    });

    expect(result.transactions).toHaveLength(2);
    expect(result.total).toBe(2);
    expect(result.transactions[0].political_organization_name).toBe("組織A");
  });

  it("should throw error when organization not found", async () => {
    (mockPoliticalOrganizationRepository.findBySlugs as jest.Mock).mockResolvedValue([]);

    await expect(
      usecase.execute({
        slugs: ["non-existent-org"],
        financialYear: 2025,
      }),
    ).rejects.toThrow('Political organizations with slugs "non-existent-org" not found');
  });

  it("should pass correct filters to repository", async () => {
    const mockOrganizations = [{ id: "1", slug: "test-org" }];

    (mockPoliticalOrganizationRepository.findBySlugs as jest.Mock).mockResolvedValue(
      mockOrganizations,
    );
    (
      mockTransactionRepository.findAllWithPoliticalOrganizationName as jest.Mock
    ).mockResolvedValue([]);

    await usecase.execute({
      slugs: ["test-org"],
      financialYear: 2025,
    });

    expect(mockTransactionRepository.findAllWithPoliticalOrganizationName).toHaveBeenCalledWith({
      political_organization_ids: ["1"],
      financial_year: 2025,
    });
  });

  it("should handle multiple organizations", async () => {
    const mockOrganizations = [
      { id: "1", slug: "org-1" },
      { id: "2", slug: "org-2" },
    ];
    const mockTransactions = [
      createMockTransactionWithOrgName({ id: "1", political_organization_name: "組織A" }),
      createMockTransactionWithOrgName({ id: "2", political_organization_name: "組織B" }),
    ];

    (mockPoliticalOrganizationRepository.findBySlugs as jest.Mock).mockResolvedValue(
      mockOrganizations,
    );
    (
      mockTransactionRepository.findAllWithPoliticalOrganizationName as jest.Mock
    ).mockResolvedValue(mockTransactions);

    const result = await usecase.execute({
      slugs: ["org-1", "org-2"],
      financialYear: 2025,
    });

    expect(result.transactions).toHaveLength(2);
    expect(mockTransactionRepository.findAllWithPoliticalOrganizationName).toHaveBeenCalledWith({
      political_organization_ids: ["1", "2"],
      financial_year: 2025,
    });
  });

  it("should handle empty transactions", async () => {
    const mockOrganizations = [{ id: "1", slug: "test-org" }];

    (mockPoliticalOrganizationRepository.findBySlugs as jest.Mock).mockResolvedValue(
      mockOrganizations,
    );
    (
      mockTransactionRepository.findAllWithPoliticalOrganizationName as jest.Mock
    ).mockResolvedValue([]);

    const result = await usecase.execute({
      slugs: ["test-org"],
      financialYear: 2025,
    });

    expect(result.transactions).toEqual([]);
    expect(result.total).toBe(0);
  });

  it("should handle different financial years", async () => {
    const mockOrganizations = [{ id: "1", slug: "test-org" }];

    (mockPoliticalOrganizationRepository.findBySlugs as jest.Mock).mockResolvedValue(
      mockOrganizations,
    );
    (
      mockTransactionRepository.findAllWithPoliticalOrganizationName as jest.Mock
    ).mockResolvedValue([]);

    await usecase.execute({
      slugs: ["test-org"],
      financialYear: 2024,
    });

    expect(mockTransactionRepository.findAllWithPoliticalOrganizationName).toHaveBeenCalledWith({
      political_organization_ids: ["1"],
      financial_year: 2024,
    });
  });
});
