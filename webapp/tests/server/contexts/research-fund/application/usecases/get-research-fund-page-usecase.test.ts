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
    politician: {
      name: "サンプル 太郎",
      slug: "sample-taro",
      nameKana: "さんぷる たろう",
      house: "shugiin",
      constituency: "比例東京（東京7区）",
      profileUrl: "https://team-mir.ai/member/sample-taro",
      websiteUrl: null,
      snsUrls: ["https://x.com/sample_taro"],
      hasPhoto: true,
    },
    publishedYears: [2026],
    isPublic: true,
    financialYear: 2026,
    asOfDate: "2026-08-20",
    nextUpdateNote: "11月ごろ",
    policyComment: "事務所の立ち上げに使っています",
    details: { dataNote: "仕訳が完了した支出を掲載しています。" },
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
        kind: "expense",
        id: "1",
        entryId: "1",
        date: "2026-02-10",
        accountKey: "taxi",
        description: "タクシー代",
        amount: 3_000,
        note: null,
        splitGroup: null,
        hasReceipt: true,
        receiptReady: true,
        receiptMime: "image/jpeg",
      },
      {
        kind: "expense",
        id: "2",
        entryId: "2",
        date: "2026-03-10",
        accountKey: "public-transport",
        description: "電車代",
        amount: 2_000,
        note: null,
        splitGroup: null,
        hasReceipt: false,
        receiptReady: false,
        receiptMime: null,
      },
      {
        kind: "expense",
        id: "3",
        entryId: "3",
        date: "2026-03-11",
        accountKey: "printing-pr",
        description: "チラシ印刷費",
        amount: 99_000,
        note: null,
        splitGroup: null,
        hasReceipt: false,
        receiptReady: false,
        receiptMime: null,
      },
    ],
    groups: [
      {
        id: "7",
        title: "広報活動",
        description: "チラシを配りました",
        outcomes: [{ label: "配布報告", url: null }],
        entries: [
          { entryId: "3", entryDate: "2026-03-11", amount: 99_000, accountKey: "printing-pr" },
        ],
      },
    ],
    ...overrides,
  };
}

function usecaseWith(value: PublishedResearchFund | null) {
  const repository: ResearchFundRepository = {
    findPublished: jest.fn().mockResolvedValue(value),
    findPublishedByOrganization: jest.fn().mockResolvedValue(null),
    findPoliticians: jest.fn().mockResolvedValue([]),
    findPublishedPageRefs: jest.fn().mockResolvedValue([]),
    findPublishedReceipt: jest.fn().mockResolvedValue(null),
  };
  return { usecase: new GetResearchFundPageUsecase(repository), repository };
}

describe("GetResearchFundPageUsecase", () => {
  it("帳簿が無ければ null を返す", async () => {
    const { usecase } = usecaseWith(null);

    expect(await usecase.execute({ slug: "unknown", financialYear: 2026 })).toBeNull();
  });

  it("議員が調研費を公開する設定かをページに渡す", async () => {
    const { usecase } = usecaseWith(published({ isPublic: false }));

    const data = await usecase.execute({ slug: "sample-taro", financialYear: 2026 });

    expect(data?.isPublic).toBe(false);
  });

  it("議員カードのプロフィールに、院と選挙区から組み立てた肩書きを添える", async () => {
    const { usecase } = usecaseWith(published());

    const data = await usecase.execute({ slug: "sample-taro", financialYear: 2026 });

    expect(data?.politician).toEqual({
      name: "サンプル 太郎",
      slug: "sample-taro",
      nameKana: "さんぷる たろう",
      title: "衆議院議員・比例東京（東京7区）",
      profileUrl: "https://team-mir.ai/member/sample-taro",
      websiteUrl: null,
      snsUrls: ["https://x.com/sample_taro"],
      hasPhoto: true,
    });
  });

  it("年の切り替えに出す年度は、公開済みの年度に表示中の年度を足して昇順に並べる", async () => {
    const { usecase } = usecaseWith(published({ financialYear: 2026, publishedYears: [2025] }));

    const data = await usecase.execute({ slug: "sample-taro", financialYear: 2026 });

    expect(data?.years).toEqual([2025, 2026]);
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

    // 支給額（200万円）の1%未満のタクシー代と電車・バス代は「その他」にまとまる
    expect(data?.sankey.detailed.nodes.map((node) => node.label)).toEqual([
      "公費から支給",
      "合計",
      "印刷・広報費",
      "その他",
      "未使用・未処理",
    ]);
    // 法律上の区分では ⑨ 滞在費 にタクシー代と電車・バス代が統合される（1%未満が1つだけなのでまとめない）
    expect(data?.sankey.legal.nodes.map((node) => node.label)).toEqual([
      "公費から支給",
      "合計",
      "⑥ 広報紙誌の発行その他の事業費",
      "⑨ 滞在費",
      "未使用・未処理",
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

  it("用途カードに紐づいた明細に支出群のIDを添える", async () => {
    const { usecase } = usecaseWith(published());

    const data = await usecase.execute({ slug: "sample-taro", financialYear: 2026 });

    expect(data?.expenses.map((expense) => [expense.id, expense.groupId])).toEqual([
      ["3", "7"],
      ["2", null],
      ["1", null],
    ]);
  });

  it("帳簿の公開用メタ情報をそのまま渡す", async () => {
    const { usecase } = usecaseWith(published());

    const data = await usecase.execute({ slug: "sample-taro", financialYear: 2026 });

    expect(data?.asOfDate).toBe("2026-08-20");
    expect(data?.grantPeriodLabel).toBe("2026年2月〜8月支給分");
    expect(data?.nextUpdateNote).toBe("11月ごろ");
    expect(data?.policyComment).toBe("事務所の立ち上げに使っています");
    expect(data?.dataNote).toBe(
      "仕訳が完了した支出を掲載しています。",
    );
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

describe("GetResearchFundPageUsecase と法定区分の上書き（#1880）", () => {
  const research = { key: "research", label: "⑦ 調査研究費" };

  /** 印刷・広報費の仕訳（id 3）だけを ⑦ 調査研究費 に上書きした帳簿 */
  function overridden(): PublishedResearchFund {
    const base = published();
    return {
      ...base,
      rows: base.rows.map((row) =>
        row.accountKey === "printing-pr" ? { ...row, legalCategoryOverride: research } : row,
      ),
      expenses: base.expenses.map((expense) =>
        expense.entryId === "3" ? { ...expense, legalCategoryOverride: research } : expense,
      ),
    };
  }

  it("法律上の区分のサンキーと明細の区分が、同じ上書き先の区分になる", async () => {
    const { usecase } = usecaseWith(overridden());

    const data = await usecase.execute({ slug: "sample-taro", financialYear: 2026 });

    expect(data?.sankey.legal.nodes.map((node) => node.label)).toEqual([
      "公費から支給",
      "合計",
      "⑦ 調査研究費",
      "⑨ 滞在費",
      "未使用・未処理",
    ]);
    expect(data?.expenses.find((expense) => expense.entryId === "3")?.legal.label).toBe(
      "⑦ 調査研究費",
    );
  });

  it("詳細の区分（科目）のサンキー・明細の科目・用途カードの科目は上書きの影響を受けない", async () => {
    const plain = await usecaseWith(published()).usecase.execute({
      slug: "sample-taro",
      financialYear: 2026,
    });
    const data = await usecaseWith(overridden()).usecase.execute({
      slug: "sample-taro",
      financialYear: 2026,
    });

    expect(data?.sankey.detailed).toEqual(plain?.sankey.detailed);
    expect(data?.expenses.map((expense) => expense.detailed)).toEqual(
      plain?.expenses.map((expense) => expense.detailed),
    );
    expect(data?.groups).toEqual(plain?.groups);
  });
});
