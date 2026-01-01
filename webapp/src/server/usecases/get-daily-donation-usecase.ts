import type { IPoliticalOrganizationRepository } from "@/server/contexts/public-finance/domain/repositories/political-organization-repository.interface";
import type {
  DailyDonationData,
  ITransactionRepository,
} from "../repositories/interfaces/transaction-repository.interface";

export interface DonationSummaryData {
  dailyDonationData: DailyDonationData[];
  totalAmount: number; // 累計寄附金額
  amountDayOverDay: number; // 寄附金額の前日比
  lastNonZeroDonationDate: string | null; // 最後に0以外の寄附があった日
}

export interface GetDailyDonationParams {
  slugs: string[];
  financialYear: number;
  today: Date;
  days: number;
}

export interface GetDailyDonationResult {
  donationSummary: DonationSummaryData;
}

export class GetDailyDonationUsecase {
  constructor(
    private transactionRepository: ITransactionRepository,
    private politicalOrganizationRepository: IPoliticalOrganizationRepository,
  ) {}

  async execute(params: GetDailyDonationParams): Promise<GetDailyDonationResult> {
    try {
      const politicalOrganizations = await this.politicalOrganizationRepository.findBySlugs(
        params.slugs,
      );

      if (politicalOrganizations.length === 0) {
        throw new Error(
          `Political organizations with slugs "${params.slugs.join(", ")}" not found`,
        );
      }

      const organizationIds = politicalOrganizations.map((org) => org.id);

      // ② 日付ごとにgroup byされた寄附をクエリで取得
      const rawDailyData = await this.transactionRepository.getDailyDonationData(
        organizationIds,
        params.financialYear,
      );

      // ③ 毎日寄附があるわけではないので、日付が歯抜けにならないよう日付を追加し、金額をゼロ埋めする
      const filledDailyData = this.fillMissingDates(rawDailyData, params.financialYear);

      // ④ ③に対してcumsumを追加する
      const cumulativeDailyData = this.calculateCumSum(filledDailyData);

      // ⑤ ④の直近N日をsliceしてdailyDonationDataとして返す
      const recentDailyData = this.sliceRecentDays(cumulativeDailyData, params.days, params.today);

      // ⑥ その他返り値の型は変更ないので埋めて返す
      const donationSummary = this.buildDonationSummary(recentDailyData, params.today);

      return { donationSummary };
    } catch (error) {
      throw new Error(
        `Failed to get daily donation data: ${error instanceof Error ? error.message : "Unknown error"}`,
      );
    }
  }

  private fillMissingDates(
    rawDailyData: DailyDonationData[],
    financialYear: number,
  ): DailyDonationData[] {
    // 政治団体の財政年度の開始日と終了日を計算（1月1日〜12月31日）
    const startDate = new Date(financialYear, 0, 1); // 1月1日
    const endDate = new Date(financialYear, 11, 31); // 12月31日

    // 既存データをMapに変換（日付をキーに）
    const dataMap = new Map<string, DailyDonationData>();
    for (const item of rawDailyData) {
      dataMap.set(item.date, item);
    }

    // すべての日付を生成してゼロ埋め
    const filledData: DailyDonationData[] = [];
    const currentDate = new Date(startDate);

    while (currentDate <= endDate) {
      const dateStr = currentDate.toISOString().split("T")[0];
      const existingData = dataMap.get(dateStr);

      if (existingData) {
        filledData.push(existingData);
      } else {
        filledData.push({
          date: dateStr,
          dailyAmount: 0,
          cumulativeAmount: 0, // この段階では0、後でcumsumで計算する
        });
      }

      currentDate.setDate(currentDate.getDate() + 1);
    }

    return filledData;
  }

  private calculateCumSum(filledData: DailyDonationData[]): DailyDonationData[] {
    let cumulativeAmount = 0;
    return filledData.map((item) => {
      cumulativeAmount += item.dailyAmount;
      return {
        ...item,
        cumulativeAmount,
      };
    });
  }

  private sliceRecentDays(
    cumulativeData: DailyDonationData[],
    days: number,
    today: Date,
  ): DailyDonationData[] {
    const todayStr = today.toISOString().split("T")[0];

    // 今日の位置を見つける
    const todayIndex = cumulativeData.findIndex((item) => item.date === todayStr);

    if (todayIndex === -1) {
      // 今日のデータが見つからない場合は、最後のN日を返す
      return cumulativeData.slice(-days);
    }

    // 今日から遡ってN日分のデータを取得
    const startIndex = Math.max(0, todayIndex - days + 1);
    return cumulativeData.slice(startIndex, todayIndex + 1);
  }

  private buildDonationSummary(
    recentDailyData: DailyDonationData[],
    today: Date,
  ): DonationSummaryData {
    // 統計情報を計算
    const totalAmount = recentDailyData[recentDailyData.length - 1]?.cumulativeAmount || 0;

    // 今日と昨日の日付を文字列で準備
    const todayStr = today.toISOString().split("T")[0];
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    const yesterdayStr = yesterday.toISOString().split("T")[0];

    // 今日と昨日の寄附データを検索
    const todayData = recentDailyData.find((item) => item.date === todayStr);
    const yesterdayData = recentDailyData.find((item) => item.date === yesterdayStr);

    // 前日比の計算（常に差分を計算）
    const todayDonation = todayData?.dailyAmount || 0;
    const yesterdayDonation = yesterdayData?.dailyAmount || 0;
    const amountDayOverDay = todayDonation - yesterdayDonation;

    // 最後に0以外の寄附があった日を検索（逆順で検索）
    const lastNonZeroDonationDate =
      recentDailyData
        .slice()
        .reverse()
        .find((item) => item.dailyAmount > 0)?.date || null;

    return {
      dailyDonationData: recentDailyData,
      totalAmount,
      amountDayOverDay,
      lastNonZeroDonationDate,
    };
  }
}
