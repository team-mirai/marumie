import { GetSankeyAggregationUsecase } from "@/server/contexts/public-finance/application/usecases/get-sankey-aggregation-usecase";
import type {
  ITransactionRepository,
  SankeyCategoryAggregationResult,
} from "@/server/contexts/public-finance/domain/repositories/transaction-repository.interface";
import type { IPoliticalOrganizationRepository } from "@/server/contexts/public-finance/domain/repositories/political-organization-repository.interface";
import type {
  IBalanceSnapshotRepository,
  TotalBalancesByYear,
} from "@/server/contexts/public-finance/domain/repositories/balance-snapshot-repository.interface";
import type { IBalanceSheetRepository } from "@/server/contexts/public-finance/domain/repositories/balance-sheet-repository.interface";

const mockTransactionRepository = {
  getCategoryAggregationForSankey: jest.fn(),
} as unknown as ITransactionRepository;

const mockPoliticalOrganizationRepository = {
  findBySlugs: jest.fn(),
} as unknown as IPoliticalOrganizationRepository;

const mockBalanceSnapshotRepository = {
  getTotalLatestBalancesByYear: jest.fn(),
} as unknown as IBalanceSnapshotRepository;

const mockBalanceSheetRepository = {
  getCurrentLiabilities: jest.fn(),
} as unknown as IBalanceSheetRepository;

describe("GetSankeyAggregationUsecase", () => {
  let usecase: GetSankeyAggregationUsecase;

  beforeEach(() => {
    jest.clearAllMocks();
    usecase = new GetSankeyAggregationUsecase(
      mockTransactionRepository,
      mockPoliticalOrganizationRepository,
      mockBalanceSnapshotRepository,
      mockBalanceSheetRepository,
    );
  });

  it("should return sankey data for valid organization", async () => {
    const mockOrganizations = [{ id: "1", slug: "test-org" }];
    const mockAggregation: SankeyCategoryAggregationResult = {
      income: [
        {
          category: "寄附",
          subcategory: "個人からの寄附",
          totalAmount: 1000000,
        },
      ],
      expense: [
        {
          category: "政治活動費",
          subcategory: "宣伝費",
          totalAmount: 500000,
        },
      ],
    };
    const mockBalances: TotalBalancesByYear = {
      currentYear: 300000,
      previousYear: 200000,
    };

    (mockPoliticalOrganizationRepository.findBySlugs as jest.Mock).mockResolvedValue(
      mockOrganizations,
    );
    (mockTransactionRepository.getCategoryAggregationForSankey as jest.Mock).mockResolvedValue(
      mockAggregation,
    );
    (mockBalanceSnapshotRepository.getTotalLatestBalancesByYear as jest.Mock).mockResolvedValue(
      mockBalances,
    );
    (mockBalanceSheetRepository.getCurrentLiabilities as jest.Mock).mockResolvedValue(0);

    const result = await usecase.execute({
      slugs: ["test-org"],
      financialYear: 2025,
      categoryType: "political-category",
    });

    expect(result.sankeyData).toBeDefined();
    expect(result.sankeyData.nodes).toBeDefined();
    expect(result.sankeyData.links).toBeDefined();
    expect(mockPoliticalOrganizationRepository.findBySlugs).toHaveBeenCalledWith(["test-org"]);
    expect(mockTransactionRepository.getCategoryAggregationForSankey).toHaveBeenCalledWith(
      ["1"],
      2025,
      "political-category",
    );
  });

  it("should handle friendly-category type", async () => {
    const mockOrganizations = [{ id: "1", slug: "test-org" }];
    const mockAggregation: SankeyCategoryAggregationResult = {
      income: [{ category: "寄附", totalAmount: 1000000 }],
      expense: [{ category: "政治活動費", totalAmount: 500000 }],
    };
    const mockBalances: TotalBalancesByYear = {
      currentYear: 0,
      previousYear: 0,
    };

    (mockPoliticalOrganizationRepository.findBySlugs as jest.Mock).mockResolvedValue(
      mockOrganizations,
    );
    (mockTransactionRepository.getCategoryAggregationForSankey as jest.Mock).mockResolvedValue(
      mockAggregation,
    );
    (mockBalanceSnapshotRepository.getTotalLatestBalancesByYear as jest.Mock).mockResolvedValue(
      mockBalances,
    );
    (mockBalanceSheetRepository.getCurrentLiabilities as jest.Mock).mockResolvedValue(0);

    const result = await usecase.execute({
      slugs: ["test-org"],
      financialYear: 2025,
      categoryType: "friendly-category",
    });

    expect(result.sankeyData).toBeDefined();
    expect(mockTransactionRepository.getCategoryAggregationForSankey).toHaveBeenCalledWith(
      ["1"],
      2025,
      "friendly-category",
    );
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

  it("should handle multiple organizations", async () => {
    const mockOrganizations = [
      { id: "1", slug: "org-1" },
      { id: "2", slug: "org-2" },
    ];
    const mockAggregation: SankeyCategoryAggregationResult = {
      income: [{ category: "寄附", totalAmount: 2000000 }],
      expense: [{ category: "政治活動費", totalAmount: 1000000 }],
    };
    const mockBalances: TotalBalancesByYear = {
      currentYear: 500000,
      previousYear: 300000,
    };

    (mockPoliticalOrganizationRepository.findBySlugs as jest.Mock).mockResolvedValue(
      mockOrganizations,
    );
    (mockTransactionRepository.getCategoryAggregationForSankey as jest.Mock).mockResolvedValue(
      mockAggregation,
    );
    (mockBalanceSnapshotRepository.getTotalLatestBalancesByYear as jest.Mock).mockResolvedValue(
      mockBalances,
    );
    (mockBalanceSheetRepository.getCurrentLiabilities as jest.Mock).mockResolvedValue(0);

    const result = await usecase.execute({
      slugs: ["org-1", "org-2"],
      financialYear: 2025,
    });

    expect(result.sankeyData).toBeDefined();
    expect(mockTransactionRepository.getCategoryAggregationForSankey).toHaveBeenCalledWith(
      ["1", "2"],
      2025,
      undefined,
    );
  });

  it("should handle empty aggregation data", async () => {
    const mockOrganizations = [{ id: "1", slug: "test-org" }];
    const mockAggregation: SankeyCategoryAggregationResult = {
      income: [],
      expense: [],
    };
    const mockBalances: TotalBalancesByYear = {
      currentYear: 0,
      previousYear: 0,
    };

    (mockPoliticalOrganizationRepository.findBySlugs as jest.Mock).mockResolvedValue(
      mockOrganizations,
    );
    (mockTransactionRepository.getCategoryAggregationForSankey as jest.Mock).mockResolvedValue(
      mockAggregation,
    );
    (mockBalanceSnapshotRepository.getTotalLatestBalancesByYear as jest.Mock).mockResolvedValue(
      mockBalances,
    );
    (mockBalanceSheetRepository.getCurrentLiabilities as jest.Mock).mockResolvedValue(0);

    const result = await usecase.execute({
      slugs: ["test-org"],
      financialYear: 2025,
    });

    expect(result.sankeyData).toBeDefined();
    expect(result.sankeyData.nodes).toHaveLength(1);
    expect(result.sankeyData.nodes[0].label).toBe("合計");
  });

  it("should include liability balance in sankey data for friendly-category", async () => {
    const mockOrganizations = [{ id: "1", slug: "test-org" }];
    const mockAggregation: SankeyCategoryAggregationResult = {
      income: [{ category: "寄附", totalAmount: 1000000 }],
      expense: [{ category: "政治活動費", totalAmount: 500000 }],
    };
    const mockBalances: TotalBalancesByYear = {
      currentYear: 300000,
      previousYear: 200000,
    };
    const liabilityBalance = 100000;

    (mockPoliticalOrganizationRepository.findBySlugs as jest.Mock).mockResolvedValue(
      mockOrganizations,
    );
    (mockTransactionRepository.getCategoryAggregationForSankey as jest.Mock).mockResolvedValue(
      mockAggregation,
    );
    (mockBalanceSnapshotRepository.getTotalLatestBalancesByYear as jest.Mock).mockResolvedValue(
      mockBalances,
    );
    (mockBalanceSheetRepository.getCurrentLiabilities as jest.Mock).mockResolvedValue(
      liabilityBalance,
    );

    const result = await usecase.execute({
      slugs: ["test-org"],
      financialYear: 2025,
      categoryType: "friendly-category",
    });

    expect(result.sankeyData).toBeDefined();
    expect(mockBalanceSheetRepository.getCurrentLiabilities).toHaveBeenCalledWith(["1"], 2025);

    const unpaidExpenseNode = result.sankeyData.nodes.find((node) => node.label === "未払費用");
    expect(unpaidExpenseNode).toBeDefined();

    const balanceNode = result.sankeyData.nodes.find((node) => node.label === "収支");
    expect(balanceNode).toBeDefined();
  });
});
