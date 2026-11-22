import { GetMonthlyAggregationUsecase } from "@/server/contexts/public-finance/application/usecases/get-monthly-aggregation-usecase";
import type { IMonthlyAggregationRepository } from "@/server/contexts/public-finance/domain/repositories/monthly-aggregation-repository.interface";
import type { IPoliticalOrganizationRepository } from "@/server/contexts/public-finance/domain/repositories/political-organization-repository.interface";
import type { MonthlyAccountTotal } from "@/server/contexts/public-finance/domain/models/monthly-account-total";

const mockMonthlyAggregationRepository = {
  getCreditTotalsByOrganizationIds: jest.fn(),
  getDebitTotalsByOrganizationIds: jest.fn(),
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
    const mockCreditTotals: MonthlyAccountTotal[] = [
      { year: 2025, month: 1, account: "個人からの寄附", amount: 1000000 },
      { year: 2025, month: 2, account: "個人からの寄附", amount: 800000 },
      { year: 2025, month: 3, account: "個人からの寄附", amount: 1200000 },
    ];
    const mockDebitTotals: MonthlyAccountTotal[] = [
      { year: 2025, month: 1, account: "事務所費", amount: 500000 },
      { year: 2025, month: 2, account: "事務所費", amount: 600000 },
      { year: 2025, month: 3, account: "事務所費", amount: 400000 },
    ];

    (mockPoliticalOrganizationRepository.findBySlugs as jest.Mock).mockResolvedValue(
      mockOrganizations,
    );
    (mockMonthlyAggregationRepository.getCreditTotalsByOrganizationIds as jest.Mock).mockResolvedValue(
      mockCreditTotals,
    );
    (mockMonthlyAggregationRepository.getDebitTotalsByOrganizationIds as jest.Mock).mockResolvedValue(
      mockDebitTotals,
    );

    const result = await usecase.execute({
      slugs: ["test-org"],
      financialYear: 2025,
    });

    // 全12ヶ月分が返される
    expect(result.monthlyData).toHaveLength(12);
    expect(result.monthlyData[0]).toEqual({
      yearMonth: "2025-01",
      income: 1000000,
      expense: 500000,
    });
    expect(result.monthlyData[1]).toEqual({
      yearMonth: "2025-02",
      income: 800000,
      expense: 600000,
    });
    expect(result.monthlyData[2]).toEqual({
      yearMonth: "2025-03",
      income: 1200000,
      expense: 400000,
    });
    // データがない月は収支0
    expect(result.monthlyData[3]).toEqual({
      yearMonth: "2025-04",
      income: 0,
      expense: 0,
    });
    expect(mockPoliticalOrganizationRepository.findBySlugs).toHaveBeenCalledWith(["test-org"]);
    expect(mockMonthlyAggregationRepository.getCreditTotalsByOrganizationIds).toHaveBeenCalledWith(
      ["1"],
      2025,
    );
    expect(mockMonthlyAggregationRepository.getDebitTotalsByOrganizationIds).toHaveBeenCalledWith(
      ["1"],
      2025,
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
    const mockCreditTotals: MonthlyAccountTotal[] = [
      { year: 2025, month: 1, account: "個人からの寄附", amount: 2000000 },
    ];
    const mockDebitTotals: MonthlyAccountTotal[] = [
      { year: 2025, month: 1, account: "事務所費", amount: 1000000 },
    ];

    (mockPoliticalOrganizationRepository.findBySlugs as jest.Mock).mockResolvedValue(
      mockOrganizations,
    );
    (mockMonthlyAggregationRepository.getCreditTotalsByOrganizationIds as jest.Mock).mockResolvedValue(
      mockCreditTotals,
    );
    (mockMonthlyAggregationRepository.getDebitTotalsByOrganizationIds as jest.Mock).mockResolvedValue(
      mockDebitTotals,
    );

    const result = await usecase.execute({
      slugs: ["org-1", "org-2"],
      financialYear: 2025,
    });

    // 全12ヶ月分が返される
    expect(result.monthlyData).toHaveLength(12);
    expect(result.monthlyData[0]).toEqual({
      yearMonth: "2025-01",
      income: 2000000,
      expense: 1000000,
    });
    expect(mockMonthlyAggregationRepository.getCreditTotalsByOrganizationIds).toHaveBeenCalledWith(
      ["1", "2"],
      2025,
    );
    expect(mockMonthlyAggregationRepository.getDebitTotalsByOrganizationIds).toHaveBeenCalledWith(
      ["1", "2"],
      2025,
    );
  });

  it("should handle empty monthly data", async () => {
    const mockOrganizations = [{ id: "1", slug: "test-org" }];

    (mockPoliticalOrganizationRepository.findBySlugs as jest.Mock).mockResolvedValue(
      mockOrganizations,
    );
    (mockMonthlyAggregationRepository.getCreditTotalsByOrganizationIds as jest.Mock).mockResolvedValue(
      [],
    );
    (mockMonthlyAggregationRepository.getDebitTotalsByOrganizationIds as jest.Mock).mockResolvedValue(
      [],
    );

    const result = await usecase.execute({
      slugs: ["test-org"],
      financialYear: 2025,
    });

    // 全12ヶ月分が収支0で返される
    expect(result.monthlyData).toHaveLength(12);
    for (const item of result.monthlyData) {
      expect(item.income).toBe(0);
      expect(item.expense).toBe(0);
    }
    expect(result.monthlyData[0].yearMonth).toBe("2025-01");
    expect(result.monthlyData[11].yearMonth).toBe("2025-12");
  });

  it("should handle different financial years", async () => {
    const mockOrganizations = [{ id: "1", slug: "test-org" }];
    const mockCreditTotals: MonthlyAccountTotal[] = [
      { year: 2024, month: 4, account: "個人からの寄附", amount: 500000 },
    ];
    const mockDebitTotals: MonthlyAccountTotal[] = [
      { year: 2024, month: 4, account: "事務所費", amount: 300000 },
    ];

    (mockPoliticalOrganizationRepository.findBySlugs as jest.Mock).mockResolvedValue(
      mockOrganizations,
    );
    (mockMonthlyAggregationRepository.getCreditTotalsByOrganizationIds as jest.Mock).mockResolvedValue(
      mockCreditTotals,
    );
    (mockMonthlyAggregationRepository.getDebitTotalsByOrganizationIds as jest.Mock).mockResolvedValue(
      mockDebitTotals,
    );

    const result = await usecase.execute({
      slugs: ["test-org"],
      financialYear: 2024,
    });

    // 全12ヶ月分が返される
    expect(result.monthlyData).toHaveLength(12);
    expect(result.monthlyData[3]).toEqual({
      yearMonth: "2024-04",
      income: 500000,
      expense: 300000,
    });
    // データがない月は収支0
    expect(result.monthlyData[0]).toEqual({
      yearMonth: "2024-01",
      income: 0,
      expense: 0,
    });
    expect(mockMonthlyAggregationRepository.getCreditTotalsByOrganizationIds).toHaveBeenCalledWith(
      ["1"],
      2024,
    );
    expect(mockMonthlyAggregationRepository.getDebitTotalsByOrganizationIds).toHaveBeenCalledWith(
      ["1"],
      2024,
    );
  });
});
