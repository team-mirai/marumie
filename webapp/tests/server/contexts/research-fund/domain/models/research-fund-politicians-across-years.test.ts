import {
  chooseResearchFundPageYear,
  mergeResearchFundPoliticiansAcrossYears,
} from "@/server/contexts/research-fund/domain/models/research-fund-politicians-across-years";

describe("mergeResearchFundPoliticiansAcrossYears", () => {
  const politician = (slug: string, comingSoon = false) => ({ slug, comingSoon });

  it("一番新しい年度の一覧の順に並べ、前の年度にしかいない議員を後ろに足す", () => {
    const merged = mergeResearchFundPoliticiansAcrossYears([
      { financialYear: 2025, politicians: [politician("c"), politician("old")] },
      { financialYear: 2026, politicians: [politician("a"), politician("b"), politician("c")] },
    ]);

    expect(merged.map((entry) => entry.slug)).toEqual(["a", "b", "c", "old"]);
  });

  it("年度を渡す順に関係なく、新しい年度の順にそろえる", () => {
    const merged = mergeResearchFundPoliticiansAcrossYears([
      { financialYear: 2026, politicians: [politician("b"), politician("a")] },
      { financialYear: 2025, politicians: [politician("a"), politician("old")] },
    ]);

    expect(merged.map((entry) => entry.slug)).toEqual(["b", "a", "old"]);
  });

  it("公開している年度を新しい順に持ち、latest は一番新しい年度の一覧の議員にする", () => {
    const a2025 = { slug: "a", comingSoon: false, name: "2025年の一覧" };
    const a2026 = { slug: "a", comingSoon: false, name: "2026年の一覧" };
    const [entry] = mergeResearchFundPoliticiansAcrossYears([
      { financialYear: 2025, politicians: [a2025] },
      { financialYear: 2026, politicians: [a2026] },
    ]);

    expect(entry.latest).toBe(a2026);
    expect(entry.publishedYears).toEqual([
      { financialYear: 2026, politician: a2026 },
      { financialYear: 2025, politician: a2025 },
    ]);
  });

  it("準備中の議員は並びには入れるが、公開している年度には数えない", () => {
    const merged = mergeResearchFundPoliticiansAcrossYears(
      [{ financialYear: 2026, politicians: [politician("a"), politician("soon", true)] }],
      (entry) => !entry.comingSoon,
    );

    expect(merged.map((entry) => [entry.slug, entry.publishedYears.length])).toEqual([
      ["a", 1],
      ["soon", 0],
    ]);
  });
});

describe("chooseResearchFundPageYear", () => {
  it("表示中の年度に公開していればその年度", () => {
    expect(chooseResearchFundPageYear([2026, 2025], 2025)).toBe(2025);
  });

  it("表示中の年度に公開していなければ、公開している一番新しい年度", () => {
    expect(chooseResearchFundPageYear([2025, 2026], 2024)).toBe(2026);
    expect(chooseResearchFundPageYear([2026], null)).toBe(2026);
  });

  it("どの年度にも公開していなければ null", () => {
    expect(chooseResearchFundPageYear([], 2026)).toBeNull();
  });
});
