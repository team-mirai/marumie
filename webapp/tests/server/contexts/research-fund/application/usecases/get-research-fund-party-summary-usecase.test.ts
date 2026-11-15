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
    politician: {
      name: "サンプル 太郎",
      slug: "sample-taro",
      nameKana: "さんぷる たろう",
      house: "shugiin",
      hasPhoto: true,
    },
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
    politician: {
      name: "サンプル 次郎",
      slug: "sample-jiro",
      nameKana: null,
      house: null,
      hasPhoto: false,
    },
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
    findPublishedPageRefs: jest.fn().mockResolvedValue([]),
    findPublishedReceipt: jest.fn().mockResolvedValue(null),
  };
  return { usecase: new GetResearchFundPartySummaryUsecase(repository), repository };
}

describe("GetResearchFundPartySummaryUsecase", () => {
  it("所属議員がいなければ null を返す（セクションを出さない）", async () => {
    const { usecase } = usecaseWith(null);

    expect(await usecase.execute({ slug: "no-members", financialYear: 2026 })).toBeNull();
  });

  it("議員ごとに支給・支出を集計する", async () => {
    const { usecase } = usecaseWith(party([publishedPolitician()]));

    const data = await usecase.execute({ slug: "sample-party", financialYear: 2026 });

    expect(data?.politicians[0].kpi).toEqual({ granted: 2_000_000, spent: 104_000 });
  });

  it("サンキーは費目の多い順に並べ、1%未満の費目を「その他」にまとめ、末尾に未使用分を置く", async () => {
    const { usecase } = usecaseWith(party([publishedPolitician()]));

    const data = await usecase.execute({ slug: "sample-party", financialYear: 2026 });

    // 支給 200万円の 1% = 2万円未満のタクシー代・電車・バス代は「その他」にまとまる
    const expenseLabels = (mode: "detailed" | "legal") =>
      data?.politicians[0].sankey[mode].nodes
        .filter((node) => node.nodeType === "expense")
        .map((node) => node.label);
    expect(expenseLabels("detailed")).toEqual(["印刷・広報費", "その他", "未使用・未処理"]);
    // 法律上の区分では両者が ⑨ 滞在費 に統合され、1%未満が1つだけなのでまとめない
    expect(expenseLabels("legal")).toEqual([
      "⑥ 広報紙誌の発行その他の事業費",
      "⑨ 滞在費",
      "未使用・未処理",
    ]);
  });

  it("published の仕訳が無い（準備中の）議員は並べない", async () => {
    const { usecase } = usecaseWith(party([publishedPolitician(), preparingPolitician()]));

    const data = await usecase.execute({ slug: "sample-party", financialYear: 2026 });

    expect(data?.politicians.map((politician) => politician.slug)).toEqual(["sample-taro"]);
  });

  it("公開中の議員がいなければ null を返す（セクションを出さない）", async () => {
    const { usecase } = usecaseWith(party([preparingPolitician()]));

    expect(await usecase.execute({ slug: "sample-party", financialYear: 2026 })).toBeNull();
  });

  it("議員カードのプロフィールと、議員ごとの更新日・支給期間を返す", async () => {
    const { usecase } = usecaseWith(
      party([
        publishedPolitician(),
        publishedPolitician({
          politician: {
            name: "サンプル 花子",
            slug: "sample-hanako",
            nameKana: null,
            house: null,
            hasPhoto: false,
          },
          asOfDate: null,
          publishedThrough: "2026-09-30",
        }),
      ]),
    );

    const data = await usecase.execute({ slug: "sample-party", financialYear: 2026 });

    expect(data?.politicians[0]).toMatchObject({
      slug: "sample-taro",
      name: "サンプル 太郎",
      nameKana: "さんぷる たろう",
      house: "shugiin",
      hasPhoto: true,
      asOfDate: "2026-08-20",
      grantPeriodLabel: "2026年2月〜8月支給分",
    });
    expect(data?.politicians[1]).toMatchObject({
      nameKana: null,
      house: null,
      hasPhoto: false,
      asOfDate: null,
      grantPeriodLabel: "2026年2月〜9月支給分",
    });
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
