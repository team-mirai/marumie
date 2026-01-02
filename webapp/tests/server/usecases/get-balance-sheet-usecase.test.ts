import { GetBalanceSheetUsecase } from "@/server/usecases/get-balance-sheet-usecase";
import type { ITransactionRepository } from "@/server/repositories/interfaces/transaction-repository.interface";
import type { IBalanceSnapshotRepository } from "@/server/repositories/interfaces/balance-snapshot-repository.interface";
import type { IPoliticalOrganizationRepository } from "@/server/contexts/public-finance/domain/repositories/political-organization-repository.interface";

const mockTransactionRepository = {
  getBorrowingIncomeTotal: jest.fn(),
  getBorrowingExpenseTotal: jest.fn(),
  getLiabilityBalance: jest.fn(),
} as unknown as ITransactionRepository;

const mockBalanceSnapshotRepository = {
  getTotalLatestBalanceByOrgIds: jest.fn(),
} as unknown as IBalanceSnapshotRepository;

const mockPoliticalOrganizationRepository = {
  findBySlugs: jest.fn(),
} as unknown as IPoliticalOrganizationRepository;

describe("GetBalanceSheetUsecase", () => {
  let usecase: GetBalanceSheetUsecase;

  beforeEach(() => {
    jest.clearAllMocks();
    usecase = new GetBalanceSheetUsecase(
      mockTransactionRepository,
      mockBalanceSnapshotRepository,
      mockPoliticalOrganizationRepository,
    );
  });

  it("should return balance sheet data with positive net assets", async () => {
    const mockOrganizations = [{ id: "1", slug: "test-org" }];

    (mockPoliticalOrganizationRepository.findBySlugs as jest.Mock).mockResolvedValue(
      mockOrganizations,
    );
    (mockBalanceSnapshotRepository.getTotalLatestBalanceByOrgIds as jest.Mock).mockResolvedValue(
      1000000,
    );
    (mockTransactionRepository.getBorrowingIncomeTotal as jest.Mock).mockResolvedValue(500000);
    (mockTransactionRepository.getBorrowingExpenseTotal as jest.Mock).mockResolvedValue(200000);
    (mockTransactionRepository.getLiabilityBalance as jest.Mock).mockResolvedValue(100000);

    const result = await usecase.execute({
      slugs: ["test-org"],
      financialYear: 2025,
    });

    expect(result.balanceSheetData.left.currentAssets).toBe(1000000);
    expect(result.balanceSheetData.left.fixedAssets).toBe(0);
    expect(result.balanceSheetData.right.currentLiabilities).toBe(100000);
    expect(result.balanceSheetData.right.fixedLiabilities).toBe(300000);
    expect(result.balanceSheetData.right.netAssets).toBe(600000);
    expect(result.balanceSheetData.left.debtExcess).toBe(0);
  });

  it("should return balance sheet data with debt excess", async () => {
    const mockOrganizations = [{ id: "1", slug: "test-org" }];

    (mockPoliticalOrganizationRepository.findBySlugs as jest.Mock).mockResolvedValue(
      mockOrganizations,
    );
    (mockBalanceSnapshotRepository.getTotalLatestBalanceByOrgIds as jest.Mock).mockResolvedValue(
      100000,
    );
    (mockTransactionRepository.getBorrowingIncomeTotal as jest.Mock).mockResolvedValue(1000000);
    (mockTransactionRepository.getBorrowingExpenseTotal as jest.Mock).mockResolvedValue(0);
    (mockTransactionRepository.getLiabilityBalance as jest.Mock).mockResolvedValue(200000);

    const result = await usecase.execute({
      slugs: ["test-org"],
      financialYear: 2025,
    });

    expect(result.balanceSheetData.left.currentAssets).toBe(100000);
    expect(result.balanceSheetData.left.fixedAssets).toBe(0);
    expect(result.balanceSheetData.right.currentLiabilities).toBe(200000);
    expect(result.balanceSheetData.right.fixedLiabilities).toBe(1000000);
    expect(result.balanceSheetData.right.netAssets).toBe(0);
    expect(result.balanceSheetData.left.debtExcess).toBe(1100000);
  });

  it("should handle zero balance case", async () => {
    const mockOrganizations = [{ id: "1", slug: "test-org" }];

    (mockPoliticalOrganizationRepository.findBySlugs as jest.Mock).mockResolvedValue(
      mockOrganizations,
    );
    (mockBalanceSnapshotRepository.getTotalLatestBalanceByOrgIds as jest.Mock).mockResolvedValue(
      500000,
    );
    (mockTransactionRepository.getBorrowingIncomeTotal as jest.Mock).mockResolvedValue(500000);
    (mockTransactionRepository.getBorrowingExpenseTotal as jest.Mock).mockResolvedValue(0);
    (mockTransactionRepository.getLiabilityBalance as jest.Mock).mockResolvedValue(0);

    const result = await usecase.execute({
      slugs: ["test-org"],
      financialYear: 2025,
    });

    expect(result.balanceSheetData.right.netAssets).toBe(0);
    expect(result.balanceSheetData.left.debtExcess).toBe(0);
  });

  it("should handle multiple organizations", async () => {
    const mockOrganizations = [
      { id: "1", slug: "org-1" },
      { id: "2", slug: "org-2" },
    ];

    (mockPoliticalOrganizationRepository.findBySlugs as jest.Mock).mockResolvedValue(
      mockOrganizations,
    );
    (mockBalanceSnapshotRepository.getTotalLatestBalanceByOrgIds as jest.Mock).mockResolvedValue(
      2000000,
    );
    (mockTransactionRepository.getBorrowingIncomeTotal as jest.Mock).mockResolvedValue(0);
    (mockTransactionRepository.getBorrowingExpenseTotal as jest.Mock).mockResolvedValue(0);
    (mockTransactionRepository.getLiabilityBalance as jest.Mock).mockResolvedValue(0);

    const result = await usecase.execute({
      slugs: ["org-1", "org-2"],
      financialYear: 2025,
    });

    expect(result.balanceSheetData.left.currentAssets).toBe(2000000);
    expect(mockBalanceSnapshotRepository.getTotalLatestBalanceByOrgIds).toHaveBeenCalledWith([
      "1",
      "2",
    ]);
  });

  it("should throw error when organization is not found", async () => {
    (mockPoliticalOrganizationRepository.findBySlugs as jest.Mock).mockResolvedValue([]);

    await expect(
      usecase.execute({
        slugs: ["non-existent-org"],
        financialYear: 2025,
      }),
    ).rejects.toThrow('Political organizations with slugs "non-existent-org" not found');
  });

  it("should throw error when multiple organizations are not found", async () => {
    (mockPoliticalOrganizationRepository.findBySlugs as jest.Mock).mockResolvedValue([]);

    await expect(
      usecase.execute({
        slugs: ["org-1", "org-2"],
        financialYear: 2025,
      }),
    ).rejects.toThrow('Political organizations with slugs "org-1, org-2" not found');
  });
});
