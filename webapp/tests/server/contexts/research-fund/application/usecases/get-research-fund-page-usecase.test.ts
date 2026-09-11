import { GetResearchFundPageUsecase } from "@/server/contexts/research-fund/application/usecases/get-research-fund-page-usecase";
import type { PublishedResearchFund } from "@/server/contexts/research-fund/domain/models/published-research-fund";
import type { ResearchFundRepository } from "@/server/contexts/research-fund/domain/repositories/research-fund-repository.interface";

const accounts: PublishedResearchFund["accounts"] = {
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

function published(overrides: Partial<PublishedResearchFund> = {}): PublishedResearchFund {
  return {
    politician: { name: "サンプル 太郎", slug: "sample-taro" },
    financialYear: 2026,
    asOfDate: "2026-08-20",
    nextUpdateNote: "11月ごろ",
    policyComment: "事務所の立ち上げに使っています",
    details: { dataNote: "仕訳が完了した支出を掲載しています" },
    publishedThrough: "2026-08-31",
    rows: [
      { date: "2026-02-01", accountKey: "grant-income", amount: 1_000_000, type: "grant" },
      { date: "2026-03-01", accountKey: "grant-income", amount: 1_000_000, type: "grant" },
      { date: "2026-02-10", accountKey: "taxi", amount: 3_000, type: "expense" },
      { date: "2026-03-10", accountKey: "public-transport", amount: 2_000, type: "expense" },
      { date: "2026-03-11", accountKey: "printing-pr", amount: 99_000, type: "expense" },
    ],
    accounts,
    expenses: [
      {
        id: "1",
        entryId: "1",
        date: "2026-02-10",
        accountKey: "taxi",
        description: "タクシー代",
        amount: 3_000,
        note: null,
        splitGroup: null,
        hasReceipt: true,
      },
      {
        id: "2",
        entryId: "2",
        date: "2026-03-10",
        accountKey: "public-transport",
        description: "電車代",
        amount: 2_000,
        note: null,
        splitGroup: null,
        hasReceipt: false,
      },
      {
        id: "3",
        entryId: "3",
        date: "2026-03-11",
        accountKey: "printing-pr",
        description: "チラシ印刷費",
        amount: 99_000,
        note: null,
        splitGroup: null,
        hasReceipt: false,
      },
    ],
    groups: [
      {
        id: "7",
        title: "広報活動",
        description: "チラシを配りました",
        outcomes: [{ label: "配布報告", url: null }],
        entries: [{ entryDate: "2026-03-11", amount: 99_000, accountKey: "printing-pr" }],
      },
    ],
    ...overrides,
  };
}

function usecaseWith(value: PublishedResearchFund | null) {
  const repository: ResearchFundRepository = {
    findPublished: jest.fn().mockResolvedValue(value),
    findPublishedReceipt: jest.fn().mockResolvedValue(null),
  };
  return { usecase: new GetResearchFundPageUsecase(repository), repository };
}

describe("GetResearchFundPageUsecase", () => {
  it("帳簿が無ければ null を返す", async () => {
    const { usecase } = usecaseWith(null);

    expect(await usecase.execute({ slug: "unknown", financialYear: 2026 })).toBeNull();
  });

  it("支給・支出の合計と未使用を集計する", async () => {
    const { usecase } = usecaseWith(published());

    const data = await usecase.execute({ slug: "sample-taro", financialYear: 2026 });

    expect(data?.kpi).toEqual({ granted: 2_000_000, spent: 104_000 });
    expect(data?.unused).toBe(1_896_000);
  });

  it("詳細の区分と法律上の区分でサンキーを作り分け、未使用を末尾に置く", async () => {
    const { usecase } = usecaseWith(published());

    const data = await usecase.execute({ slug: "sample-taro", financialYear: 2026 });

    expect(data?.sankey.detailed.nodes.map((node) => node.label)).toEqual([
      "公費から支給",
      "合計",
      "印刷・広報費",
      "電車・バス代",
      "タクシー代",
      "未使用",
    ]);
    // 法律上の区分では ⑨ 滞在費 にタクシー代と電車・バス代が統合される
    expect(data?.sankey.legal.nodes.map((node) => node.label)).toEqual([
      "公費から支給",
      "合計",
      "⑥ 広報紙誌の発行その他の事業費",
      "⑨ 滞在費",
      "未使用",
    ]);
  });

  it("成果カードの金額・件数・期間を紐づいた仕訳から集計する", async () => {
    const { usecase } = usecaseWith(published());

    const data = await usecase.execute({ slug: "sample-taro", financialYear: 2026 });

    expect(data?.groups[0]).toEqual({
      id: "7",
      title: "広報活動",
      description: "チラシを配りました",
      amount: 99_000,
      count: 1,
      period: { start: "2026-03-11", end: "2026-03-11" },
      categories: [{ label: "印刷・広報費", color: "#A16207" }],
      outcomes: [{ label: "配布報告", url: null }],
    });
  });

  it("帳簿の公開用メタ情報をそのまま渡す", async () => {
    const { usecase } = usecaseWith(published());

    const data = await usecase.execute({ slug: "sample-taro", financialYear: 2026 });

    expect(data?.asOfDate).toBe("2026-08-20");
    expect(data?.nextUpdateNote).toBe("11月ごろ");
    expect(data?.policyComment).toBe("事務所の立ち上げに使っています");
    expect(data?.dataNote).toBe("仕訳が完了した支出を掲載しています");
  });

  it("集計できない行があれば黙って表示せず失敗させる", async () => {
    const { usecase } = usecaseWith(
      published({
        rows: [{ date: "2026-13-99", accountKey: "taxi", amount: 1, type: "expense" }],
      }),
    );

    await expect(usecase.execute({ slug: "sample-taro", financialYear: 2026 })).rejects.toThrow(
      /調研費の集計に失敗しました/,
    );
  });
});
