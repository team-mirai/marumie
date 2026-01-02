import { GetDailyDonationUsecase } from "@/server/usecases/get-daily-donation-usecase";
import type { ITransactionRepository, DailyDonationData } from "@/server/repositories/interfaces/transaction-repository.interface";
import type { IPoliticalOrganizationRepository } from "@/server/contexts/public-finance/domain/repositories/political-organization-repository.interface";

// モックリポジトリの作成
const mockTransactionRepository = {
  getDailyDonationData: jest.fn(),
} as unknown as ITransactionRepository;

const mockPoliticalOrganizationRepository = {
  findBySlugs: jest.fn(),
} as unknown as IPoliticalOrganizationRepository;

describe("GetDailyDonationUsecase", () => {
  let usecase: GetDailyDonationUsecase;

  beforeEach(() => {
    jest.clearAllMocks();
    usecase = new GetDailyDonationUsecase(
      mockTransactionRepository,
      mockPoliticalOrganizationRepository,
    );
  });

  it("should return recent N days of data with cumulative sum", async () => {
    // モックデータの準備
    const mockOrganizations = [{ id: "1", slug: "test-org" }];
    const mockRawData: DailyDonationData[] = [
      { date: "2025-01-01", dailyAmount: 1000, cumulativeAmount: 1000 },
      { date: "2025-01-03", dailyAmount: 2000, cumulativeAmount: 3000 }, // 1/2は歯抜け
      { date: "2025-01-05", dailyAmount: 1500, cumulativeAmount: 4500 }, // 1/4は歯抜け
    ];

    // モックの設定
    (mockPoliticalOrganizationRepository.findBySlugs as jest.Mock).mockResolvedValue(
      mockOrganizations,
    );
    (mockTransactionRepository.getDailyDonationData as jest.Mock).mockResolvedValue(
      mockRawData,
    );

    // テスト実行（N=3で直近3日分を取得）
    const result = await usecase.execute({
      slugs: ["test-org"],
      financialYear: 2025,
      today: new Date("2025-01-05"),
      days: 3,
    });

    // 検証
    expect(result.donationSummary.dailyDonationData).toHaveLength(3);
    
    // 日付が連続していることを確認（歯抜けが埋められている）
    const data = result.donationSummary.dailyDonationData;
    expect(data[0].date).toBe("2025-01-03");
    expect(data[1].date).toBe("2025-01-04");
    expect(data[2].date).toBe("2025-01-05");

    // 金額が正しく設定されていることを確認
    expect(data[0].dailyAmount).toBe(2000);
    expect(data[1].dailyAmount).toBe(0); // 歯抜け日は0
    expect(data[2].dailyAmount).toBe(1500);

    // 累積和が正しく計算されていることを確認
    expect(data[0].cumulativeAmount).toBe(3000); // 1000 + 2000
    expect(data[1].cumulativeAmount).toBe(3000); // 前日と同じ（当日寄附なし）
    expect(data[2].cumulativeAmount).toBe(4500); // 3000 + 1500

    // その他のサマリー情報も確認
    expect(result.donationSummary.totalAmount).toBe(4500);
  });

  it("should handle case when today is not found in data", async () => {
    // モックデータの準備
    const mockOrganizations = [{ id: "1", slug: "test-org" }];
    const mockRawData: DailyDonationData[] = [
      { date: "2025-01-01", dailyAmount: 1000, cumulativeAmount: 1000 },
      { date: "2025-01-02", dailyAmount: 2000, cumulativeAmount: 3000 },
      { date: "2025-01-03", dailyAmount: 1500, cumulativeAmount: 4500 },
    ];

    // モックの設定
    (mockPoliticalOrganizationRepository.findBySlugs as jest.Mock).mockResolvedValue(
      mockOrganizations,
    );
    (mockTransactionRepository.getDailyDonationData as jest.Mock).mockResolvedValue(
      mockRawData,
    );

    // 今日がデータに存在しない場合をテスト（財政年度内だが、データがない日）
    const result = await usecase.execute({
      slugs: ["test-org"],
      financialYear: 2025,
      today: new Date("2025-01-10"), // データ範囲外だが財政年度内
      days: 3,
    });

    // 今日を含む3日分が返されることを確認
    expect(result.donationSummary.dailyDonationData).toHaveLength(3);
    
    const data = result.donationSummary.dailyDonationData;
    expect(data[0].date).toBe("2025-01-08");
    expect(data[1].date).toBe("2025-01-09");
    expect(data[2].date).toBe("2025-01-10");
    
    // 今日のデータは0であることを確認
    expect(data[2].dailyAmount).toBe(0);
  });

  it("should throw error when organization not found", async () => {
    // モックの設定：組織が見つからない場合
    (mockPoliticalOrganizationRepository.findBySlugs as jest.Mock).mockResolvedValue([]);

    // エラーが投げられることを確認
    await expect(
      usecase.execute({
        slugs: ["non-existent-org"],
        financialYear: 2025,
        today: new Date("2025-04-05"),
        days: 3,
      }),
    ).rejects.toThrow('Political organizations with slugs "non-existent-org" not found');
  });
});