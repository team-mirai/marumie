import { GetResearchFundPartySummaryUsecase } from "@/server/contexts/research-fund/application/usecases/get-research-fund-party-summary-usecase";
import type {
  PublishedPartyResearchFund,
  PublishedPoliticianResearchFund,
} from "@/server/contexts/research-fund/domain/models/published-research-fund";
import type { ResearchFundRepository } from "@/server/contexts/research-fund/domain/repositories/research-fund-repository.interface";

const accounts: PublishedPoliticianResearchFund["accounts"] = {
  taxi: { label: "タクシー代", legalLabel: "⑨ 滞在費", legalCategoryKey: "stay" },
  "public-transport": {
    label: "電車・バス代",
    legalLabel: "⑨ 滞在費",
    legalCategoryKey: "stay",
  },
  "printing-pr": {
    label: "印刷・広報費",
    legalLabel: "⑥ 広報紙誌の発行その他の事業費",
    legalCategoryKey: "publicity",
  },
};

/** published の仕訳を持つ議員。 */
function publishedPolitician(
  overrides: Partial<PublishedPoliticianResearchFund> = {},
): PublishedPoliticianResearchFund {
  return {
    politician: { name: "サンプル 太郎", slug: "sample-taro" },
    asOfDate: "2026-08-20",
    publishedThrough: "2026-08-31",
    rows: [
      { date: "2026-02-01", accountKey: "grant-income", amount: 1_000_000, type: "grant" },
      { date: "2026-03-01", accountKey: "grant-income", amount: 1_000_000, type: "grant" },
      { date: "2026-02-10", accountKey: "taxi", amount: 3_000, type: "expense" },
      { date: "2026-03-10", accountKey: "public-transport", amount: 2_000, type: "expense" },
      { date: "2026-03-11", accountKey: "printing-pr", amount: 99_000, type: "expense" },
    ],
    accounts,
    expenseCount: 3,
    ...overrides,
  };
}

/** 帳簿はあるが published の仕訳がまだ無い「準備中」の議員。 */
function preparingPolitician(
  overrides: Partial<PublishedPoliticianResearchFund> = {},
): PublishedPoliticianResearchFund {
  return {
    politician: { name: "サンプル 次郎", slug: "sample-jiro" },
    asOfDate: null,
    publishedThrough: null,
    rows: [],
    accounts: {},
    expenseCount: 0,
    ...overrides,
  };
}

function party(
  politicians: PublishedPoliticianResearchFund[],
): PublishedPartyResearchFund | null {
  return {
    organization: { slug: "sample-party", displayName: "サンプル政党" },
    financialYear: 2026,
    politicians,
  };
}

function usecaseWith(value: PublishedPartyResearchFund | null) {
  const repository: ResearchFundRepository = {
    findPublished: jest.fn().mockResolvedValue(null),
    findPublishedByOrganization: jest.fn().mockResolvedValue(value),
    findPoliticians: jest.fn().mockResolvedValue([]),
    findPublishedReceipt: jest.fn().mockResolvedValue(null),
  };
  return { usecase: new GetResearchFundPartySummaryUsecase(repository), repository };
}

describe("GetResearchFundPartySummaryUsecase", () => {
  it("所属議員がいなければ null を返す（A-6 を出さない）", async () => {
    const { usecase } = usecaseWith(null);

    expect(await usecase.execute({ slug: "no-members", financialYear: 2026 })).toBeNull();
  });

  it("議員ごとに支給・支出を集計する", async () => {
    const { usecase } = usecaseWith(party([publishedPolitician()]));

    const data = await usecase.execute({ slug: "sample-party", financialYear: 2026 });

    expect(data?.politicians[0].kpi).toEqual({ granted: 2_000_000, spent: 104_000 });
    expect(data?.politicians[0].count).toBe(3);
  });

  it("横棒グラフは金額の多い順で、未使用分を含めない", async () => {
    const { usecase } = usecaseWith(party([publishedPolitician()]));

    const data = await usecase.execute({ slug: "sample-party", financialYear: 2026 });

    expect(data?.politicians[0].bars.detailed).toEqual([
      { key: "printing-pr", label: "印刷・広報費", amount: 99_000 },
      { key: "taxi", label: "タクシー代", amount: 3_000 },
      { key: "public-transport", label: "電車・バス代", amount: 2_000 },
    ]);
    // 法律上の区分ではタクシー代と電車・バス代が ⑨ 滞在費 に統合される
    expect(data?.politicians[0].bars.legal).toEqual([
      { key: "⑥ 広報紙誌の発行その他の事業費", label: "⑥ 広報紙誌の発行その他の事業費", amount: 99_000 },
      { key: "⑨ 滞在費", label: "⑨ 滞在費", amount: 5_000 },
    ]);
  });

  it("準備中の議員も隠さず、グラフのない行として返す", async () => {
    const { usecase } = usecaseWith(party([publishedPolitician(), preparingPolitician()]));

    const data = await usecase.execute({ slug: "sample-party", financialYear: 2026 });

    expect(data?.politicians).toHaveLength(2);
    expect(data?.politicians[1]).toEqual({
      slug: "sample-jiro",
      name: "サンプル 次郎",
      ready: false,
      statusLabel: "準備中",
      kpi: { granted: 0, spent: 0 },
      count: 0,
      bars: { detailed: [], legal: [] },
    });
  });

  it("公開範囲を議員ごと・政党全体の両方でラベルにする", async () => {
    const { usecase } = usecaseWith(party([publishedPolitician(), preparingPolitician()]));

    const data = await usecase.execute({ slug: "sample-party", financialYear: 2026 });

    expect(data?.politicians[0].statusLabel).toBe("2026年2月〜8月分を公開中");
    // 一部の議員しか公開していないことが分かるようにする
    expect(data?.coverageLabel).toBe("2026年2月〜8月分を公開中（サンプル 太郎のみ）");
  });

  it("所属議員全員が公開していれば政党全体のラベルに「のみ」を付けない", async () => {
    const { usecase } = usecaseWith(party([publishedPolitician()]));

    const data = await usecase.execute({ slug: "sample-party", financialYear: 2026 });

    expect(data?.coverageLabel).toBe("2026年2月〜8月分を公開中");
  });

  it("誰も公開していなければ準備中として扱う", async () => {
    const { usecase } = usecaseWith(party([preparingPolitician()]));

    const data = await usecase.execute({ slug: "sample-party", financialYear: 2026 });

    expect(data?.coverageLabel).toBe("準備中");
    expect(data?.asOfDate).toBeNull();
  });

  it("「◯◯時点」は公開中の議員のうち最も新しい日付を使う", async () => {
    const { usecase } = usecaseWith(
      party([
        publishedPolitician({ asOfDate: "2026-07-31" }),
        publishedPolitician({
          politician: { name: "サンプル 花子", slug: "sample-hanako" },
          asOfDate: "2026-08-20",
        }),
        // 準備中の議員の日付は代表に使わない
        preparingPolitician({ asOfDate: "2026-12-31" }),
      ]),
    );

    const data = await usecase.execute({ slug: "sample-party", financialYear: 2026 });

    expect(data?.asOfDate).toBe("2026-08-20");
  });

  it("集計できない行があれば黙って表示せず失敗させる", async () => {
    const { usecase } = usecaseWith(
      party([
        publishedPolitician({
          rows: [{ date: "2026-13-99", accountKey: "taxi", amount: 1, type: "expense" }],
        }),
      ]),
    );

    await expect(usecase.execute({ slug: "sample-party", financialYear: 2026 })).rejects.toThrow(
      /調研費の集計に失敗しました/,
    );
  });
});
