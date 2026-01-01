import { GetMonthlyAggregationUsecase } from "@/server/contexts/public-finance/application/usecases/get-monthly-aggregation-usecase";
import type { MonthlyAggregation } from "@/server/contexts/public-finance/domain/models/monthly-aggregation";
import type { IMonthlyAggregationRepository } from "@/server/contexts/public-finance/domain/repositories/monthly-aggregation-repository.interface";
import type { IPoliticalOrganizationRepository } from "@/server/contexts/public-finance/domain/repositories/political-organization-repository.interface";

const mockMonthlyAggregationRepository = {
  getByOrganizationIds: jest.fn(),
} as unknown as IMonthlyAggregationRepository;

const mockPoliticalOrganizationRepository = {
  findBySlugs: jest.fn(),
} as unknown as IPoliticalOrganizationRepository;

describe("GetMonthlyAggregationUsecase", () => {
  let usecase: GetMonthlyAggregationUsecase;

  beforeEach(() => {
    jest.clearAllMocks();
    usecase = new GetMonthlyAggregationUsecase(
      mockMonthlyAggregationRepository,
      mockPoliticalOrganizationRepository,
    );
  });

  it("should return monthly aggregation data for valid organization", async () => {
    const mockOrganizations = [{ id: "1", slug: "test-org" }];
    const mockMonthlyData: MonthlyAggregation[] = [
      { yearMonth: "2025-01", income: 1000000, expense: 500000 },
      { yearMonth: "2025-02", income: 800000, expense: 600000 },
      { yearMonth: "2025-03", income: 1200000, expense: 400000 },
    ];

    (mockPoliticalOrganizationRepository.findBySlugs as jest.Mock).mockResolvedValue(
      mockOrganizations,
    );
    (mockMonthlyAggregationRepository.getByOrganizationIds as jest.Mock).mockResolvedValue(
      mockMonthlyData,
    );

    const result = await usecase.execute({
      slugs: ["test-org"],
      financialYear: 2025,
    });

    expect(result.monthlyData).toHaveLength(3);
    expect(result.monthlyData[0]).toEqual({
      yearMonth: "2025-01",
      income: 1000000,
      expense: 500000,
    });
    expect(mockPoliticalOrganizationRepository.findBySlugs).toHaveBeenCalledWith(["test-org"]);
    expect(mockMonthlyAggregationRepository.getByOrganizationIds).toHaveBeenCalledWith(["1"], 2025);
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
    const mockMonthlyData: MonthlyAggregation[] = [
      { yearMonth: "2025-01", income: 2000000, expense: 1000000 },
    ];

    (mockPoliticalOrganizationRepository.findBySlugs as jest.Mock).mockResolvedValue(
      mockOrganizations,
    );
    (mockMonthlyAggregationRepository.getByOrganizationIds as jest.Mock).mockResolvedValue(
      mockMonthlyData,
    );

    const result = await usecase.execute({
      slugs: ["org-1", "org-2"],
      financialYear: 2025,
    });

    expect(result.monthlyData).toHaveLength(1);
    expect(mockMonthlyAggregationRepository.getByOrganizationIds).toHaveBeenCalledWith(
      ["1", "2"],
      2025,
    );
  });

  it("should handle empty monthly data", async () => {
    const mockOrganizations = [{ id: "1", slug: "test-org" }];

    (mockPoliticalOrganizationRepository.findBySlugs as jest.Mock).mockResolvedValue(
      mockOrganizations,
    );
    (mockMonthlyAggregationRepository.getByOrganizationIds as jest.Mock).mockResolvedValue([]);

    const result = await usecase.execute({
      slugs: ["test-org"],
      financialYear: 2025,
    });

    expect(result.monthlyData).toEqual([]);
  });

  it("should handle different financial years", async () => {
    const mockOrganizations = [{ id: "1", slug: "test-org" }];
    const mockMonthlyData: MonthlyAggregation[] = [
      { yearMonth: "2024-04", income: 500000, expense: 300000 },
    ];

    (mockPoliticalOrganizationRepository.findBySlugs as jest.Mock).mockResolvedValue(
      mockOrganizations,
    );
    (mockMonthlyAggregationRepository.getByOrganizationIds as jest.Mock).mockResolvedValue(
      mockMonthlyData,
    );

    const result = await usecase.execute({
      slugs: ["test-org"],
      financialYear: 2024,
    });

    expect(result.monthlyData).toHaveLength(1);
    expect(mockMonthlyAggregationRepository.getByOrganizationIds).toHaveBeenCalledWith(["1"], 2024);
  });
});
