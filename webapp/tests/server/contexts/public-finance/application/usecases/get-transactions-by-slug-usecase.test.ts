import { GetTransactionsBySlugUsecase } from "@/server/contexts/public-finance/application/usecases/get-transactions-by-slug-usecase";
import type { ITransactionListRepository } from "@/server/contexts/public-finance/domain/repositories/transaction-list-repository.interface";
import type { PaginatedResult } from "@/server/contexts/public-finance/domain/repositories/transaction-list-repository.interface";
import type { IPoliticalOrganizationRepository } from "@/server/contexts/public-finance/domain/repositories/political-organization-repository.interface";
import type { Transaction } from "@/shared/models/transaction";

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

const mockTransactionRepository = {
  findWithPagination: jest.fn(),
  getLastUpdatedAt: jest.fn(),
} as unknown as ITransactionListRepository;

const mockPoliticalOrganizationRepository = {
  findBySlugs: jest.fn(),
} as unknown as IPoliticalOrganizationRepository;

describe("GetTransactionsBySlugUsecase", () => {
  let usecase: GetTransactionsBySlugUsecase;

  beforeEach(() => {
    jest.clearAllMocks();
    usecase = new GetTransactionsBySlugUsecase(
      mockTransactionRepository,
      mockPoliticalOrganizationRepository,
    );
  });

  it("should return paginated transactions for valid organization", async () => {
    const mockOrganizations = [{ id: "1", slug: "test-org", displayName: "テスト組織" }];
    const mockTransactions = [
      createMockTransaction({ id: "1" }),
      createMockTransaction({ id: "2" }),
    ];
    const mockPaginatedResult: PaginatedResult<Transaction> = {
      items: mockTransactions,
      total: 2,
      page: 1,
      perPage: 50,
      totalPages: 1,
    };

    (mockPoliticalOrganizationRepository.findBySlugs as jest.Mock).mockResolvedValue(
      mockOrganizations,
    );
    (mockTransactionRepository.findWithPagination as jest.Mock).mockResolvedValue(
      mockPaginatedResult,
    );
    (mockTransactionRepository.getLastUpdatedAt as jest.Mock).mockResolvedValue(
      new Date("2025-01-01"),
    );

    const result = await usecase.execute({
      slugs: ["test-org"],
      financialYear: 2025,
    });

    expect(result.transactions).toHaveLength(2);
    expect(result.total).toBe(2);
    expect(result.page).toBe(1);
    expect(result.perPage).toBe(50);
    expect(result.totalPages).toBe(1);
    expect(result.politicalOrganizations).toEqual(mockOrganizations);
    expect(result.lastUpdatedAt).toBe("2025-01-01T00:00:00.000Z");
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

  it("should handle pagination parameters", async () => {
    const mockOrganizations = [{ id: "1", slug: "test-org" }];
    const mockPaginatedResult: PaginatedResult<Transaction> = {
      items: [createMockTransaction()],
      total: 100,
      page: 2,
      perPage: 10,
      totalPages: 10,
    };

    (mockPoliticalOrganizationRepository.findBySlugs as jest.Mock).mockResolvedValue(
      mockOrganizations,
    );
    (mockTransactionRepository.findWithPagination as jest.Mock).mockResolvedValue(
      mockPaginatedResult,
    );
    (mockTransactionRepository.getLastUpdatedAt as jest.Mock).mockResolvedValue(null);

    const result = await usecase.execute({
      slugs: ["test-org"],
      financialYear: 2025,
      page: 2,
      perPage: 10,
    });

    expect(result.page).toBe(2);
    expect(result.perPage).toBe(10);
    expect(result.totalPages).toBe(10);
    expect(result.lastUpdatedAt).toBeNull();
  });

  it("should enforce perPage maximum of 100", async () => {
    const mockOrganizations = [{ id: "1", slug: "test-org" }];
    const mockPaginatedResult: PaginatedResult<Transaction> = {
      items: [],
      total: 0,
      page: 1,
      perPage: 100,
      totalPages: 0,
    };

    (mockPoliticalOrganizationRepository.findBySlugs as jest.Mock).mockResolvedValue(
      mockOrganizations,
    );
    (mockTransactionRepository.findWithPagination as jest.Mock).mockResolvedValue(
      mockPaginatedResult,
    );
    (mockTransactionRepository.getLastUpdatedAt as jest.Mock).mockResolvedValue(null);

    await usecase.execute({
      slugs: ["test-org"],
      financialYear: 2025,
      perPage: 200,
    });

    expect(mockTransactionRepository.findWithPagination).toHaveBeenCalledWith(
      expect.any(Object),
      expect.objectContaining({ perPage: 100 }),
    );
  });

  it("should enforce page minimum of 1", async () => {
    const mockOrganizations = [{ id: "1", slug: "test-org" }];
    const mockPaginatedResult: PaginatedResult<Transaction> = {
      items: [],
      total: 0,
      page: 1,
      perPage: 50,
      totalPages: 0,
    };

    (mockPoliticalOrganizationRepository.findBySlugs as jest.Mock).mockResolvedValue(
      mockOrganizations,
    );
    (mockTransactionRepository.findWithPagination as jest.Mock).mockResolvedValue(
      mockPaginatedResult,
    );
    (mockTransactionRepository.getLastUpdatedAt as jest.Mock).mockResolvedValue(null);

    await usecase.execute({
      slugs: ["test-org"],
      financialYear: 2025,
      page: -1,
    });

    expect(mockTransactionRepository.findWithPagination).toHaveBeenCalledWith(
      expect.any(Object),
      expect.objectContaining({ page: 1 }),
    );
  });

  it("should pass filter parameters correctly", async () => {
    const mockOrganizations = [{ id: "1", slug: "test-org" }];
    const mockPaginatedResult: PaginatedResult<Transaction> = {
      items: [],
      total: 0,
      page: 1,
      perPage: 50,
      totalPages: 0,
    };

    (mockPoliticalOrganizationRepository.findBySlugs as jest.Mock).mockResolvedValue(
      mockOrganizations,
    );
    (mockTransactionRepository.findWithPagination as jest.Mock).mockResolvedValue(
      mockPaginatedResult,
    );
    (mockTransactionRepository.getLastUpdatedAt as jest.Mock).mockResolvedValue(null);

    const dateFrom = new Date("2025-01-01");
    const dateTo = new Date("2025-12-31");

    await usecase.execute({
      slugs: ["test-org"],
      financialYear: 2025,
      transactionType: "income",
      dateFrom,
      dateTo,
      categories: ["donation-personal"],
      sortBy: "date",
      order: "desc",
    });

    expect(mockTransactionRepository.findWithPagination).toHaveBeenCalledWith(
      expect.objectContaining({
        political_organization_ids: ["1"],
        transaction_type: "income",
        date_from: dateFrom,
        date_to: dateTo,
        category_keys: ["donation-personal"],
        financial_year: 2025,
      }),
      expect.objectContaining({
        sortBy: "date",
        order: "desc",
      }),
    );
  });

  it("should handle multiple organizations", async () => {
    const mockOrganizations = [
      { id: "1", slug: "org-1" },
      { id: "2", slug: "org-2" },
    ];
    const mockPaginatedResult: PaginatedResult<Transaction> = {
      items: [],
      total: 0,
      page: 1,
      perPage: 50,
      totalPages: 0,
    };

    (mockPoliticalOrganizationRepository.findBySlugs as jest.Mock).mockResolvedValue(
      mockOrganizations,
    );
    (mockTransactionRepository.findWithPagination as jest.Mock).mockResolvedValue(
      mockPaginatedResult,
    );
    (mockTransactionRepository.getLastUpdatedAt as jest.Mock).mockResolvedValue(null);

    await usecase.execute({
      slugs: ["org-1", "org-2"],
      financialYear: 2025,
    });

    expect(mockTransactionRepository.findWithPagination).toHaveBeenCalledWith(
      expect.objectContaining({
        political_organization_ids: ["1", "2"],
      }),
      expect.any(Object),
    );
  });
});
