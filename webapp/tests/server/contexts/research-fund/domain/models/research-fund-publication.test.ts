import {
  COMING_SOON_POLITICIAN_CONDITION,
  PUBLIC_RESEARCH_FUND_POLITICIAN_CONDITION,
  PUBLISHED_JOURNAL_ENTRY_CONDITION,
  ResearchFundPublication,
} from "@/server/contexts/research-fund/domain/models/research-fund-publication";

describe("ResearchFundPublication.isPublishedYear", () => {
  it("published の仕訳が 1 件以上あれば、その年度は公開中", () => {
    expect(ResearchFundPublication.isPublishedYear(["2026-02"])).toBe(true);
  });

  it("published の仕訳が 1 件も無ければ、その年度は未公開", () => {
    expect(ResearchFundPublication.isPublishedYear([])).toBe(false);
  });
});

describe("ResearchFundPublication.isComingSoon", () => {
  it("添え書きがあれば準備中", () => {
    expect(ResearchFundPublication.isComingSoon("12月中旬を目処に公開予定です。")).toBe(true);
    // 空白だけの添え書きも準備中（ページに出す添え書きが無いだけ）
    expect(ResearchFundPublication.isComingSoon(" ")).toBe(true);
  });

  it("添え書きが無ければ準備中ではない", () => {
    expect(ResearchFundPublication.isComingSoon(null)).toBe(false);
  });
});

describe("ResearchFundPublication.excludePublished", () => {
  it("公開中の一覧にもいる議員を準備中から外し、残りは渡した順のまま返す", () => {
    const comingSoon = [{ slug: "c" }, { slug: "a" }, { slug: "b" }];

    expect(ResearchFundPublication.excludePublished(comingSoon, [{ slug: "a" }])).toEqual([
      { slug: "c" },
      { slug: "b" },
    ]);
  });

  it("公開中の議員がいなければ、準備中の議員をすべて返す", () => {
    expect(ResearchFundPublication.excludePublished([{ slug: "a" }], [])).toEqual([{ slug: "a" }]);
  });
});

describe("検索条件", () => {
  it("述語と同じ条件でリポジトリが検索する", () => {
    expect(PUBLIC_RESEARCH_FUND_POLITICIAN_CONDITION).toEqual({ isResearchFundPublic: true });
    expect(PUBLISHED_JOURNAL_ENTRY_CONDITION).toEqual({ status: "published" });
    expect(COMING_SOON_POLITICIAN_CONDITION).toEqual({ researchFundComingSoonNote: { not: null } });
  });
});
