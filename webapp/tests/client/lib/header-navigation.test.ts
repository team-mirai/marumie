import {
  buildOrganizationMenuItems,
  buildPoliticianMenuItems,
  getCurrentNavKey,
  getHeaderNavItems,
  parseHeaderPath,
} from "@/client/lib/header-navigation";

const PREVIEW_TOKEN = "0123456789abcdef0123456789abcdef";

describe("getHeaderNavItems", () => {
  it("デザイン v8 の B 案の5項目を並べる", () => {
    expect(getHeaderNavItems(true).map((item) => item.label)).toEqual([
      "政党・政治団体",
      "調研費",
      "まる見え政治資金とは",
      "よくあるご質問",
      "データについて",
    ]);
  });

  it("調研費を公開している議員がいなければ「調研費」を出さない", () => {
    expect(getHeaderNavItems(false).map((item) => item.key)).toEqual([
      "pf",
      "about",
      "faq",
      "data",
    ]);
  });
});

describe("parseHeaderPath / getCurrentNavKey", () => {
  it("政治団体ページ（全件ページを含む）は「政党・政治団体」に下線を付ける", () => {
    const current = parseHeaderPath("/o/team-mirai/2025/transactions");
    expect(current).toEqual({ kind: "organization", slug: "team-mirai", year: 2025 });
    expect(getCurrentNavKey(current)).toBe("pf");
  });

  it("議員ページは「調研費」に下線を付け、プレビュー URL は議員の slug で読む", () => {
    const current = parseHeaderPath(`/p/sample-taro~${PREVIEW_TOKEN}/2026`);
    expect(current).toEqual({ kind: "politician", slug: "sample-taro", year: 2026 });
    expect(getCurrentNavKey(current)).toBe("rf");
  });

  it("/about は「まる見え政治資金とは」に下線を付ける", () => {
    expect(getCurrentNavKey(parseHeaderPath("/about"))).toBe("about");
  });

  it("それ以外のページはどれにも下線を付けない", () => {
    expect(getCurrentNavKey(parseHeaderPath("/"))).toBeNull();
    expect(getCurrentNavKey(parseHeaderPath("/privacy"))).toBeNull();
  });

  it("年度の無い URL は年度を null にする", () => {
    expect(parseHeaderPath("/o/team-mirai")).toEqual({
      kind: "organization",
      slug: "team-mirai",
      year: null,
    });
  });
});

describe("buildOrganizationMenuItems", () => {
  const ORGANIZATIONS = [
    { slug: "team-mirai", displayName: "チームみらい", orgName: "政党" },
    { slug: "digimin", displayName: "安野貴博の政治団体", orgName: null },
  ];

  it("表示中の団体に「表示中」を付け、その年を選ぶ", () => {
    const items = buildOrganizationMenuItems(
      ORGANIZATIONS,
      parseHeaderPath("/o/team-mirai/2025"),
    );

    expect(items[0]).toEqual({
      slug: "team-mirai",
      name: "チームみらい",
      officialName: "政党",
      isCurrent: true,
      href: "/o/team-mirai/2025",
      years: [
        { year: 2025, href: "/o/team-mirai/2025", isSelected: true },
        { year: 2026, href: "/o/team-mirai/2026", isSelected: false },
      ],
    });
    expect(items[1].isCurrent).toBe(false);
    expect(items[1].href).toBe("/o/digimin/2026");
    expect(items[1].years.some((year) => year.isSelected)).toBe(false);
  });
});

describe("buildPoliticianMenuItems", () => {
  const TARO = { slug: "sample-taro", name: "サンプル太郎" };
  const HANAKO = { slug: "sample-hanako", name: "サンプル花子" };

  it("議員ごとに公開している年度を古い順に並べ、名前は最新の年度へ移る", () => {
    const items = buildPoliticianMenuItems(
      { 2025: [HANAKO], 2026: [TARO, HANAKO] },
      parseHeaderPath("/o/team-mirai/2026"),
    );

    expect(items.map((item) => item.slug)).toEqual(["sample-taro", "sample-hanako"]);
    expect(items[1]).toEqual({
      slug: "sample-hanako",
      name: "サンプル花子",
      isCurrent: false,
      href: "/p/sample-hanako/2026",
      years: [
        { year: 2025, href: "/p/sample-hanako/2025", isSelected: false },
        { year: 2026, href: "/p/sample-hanako/2026", isSelected: false },
      ],
    });
  });

  it("表示中の議員はその年度を選び、名前もその年度へ移る", () => {
    const items = buildPoliticianMenuItems(
      { 2025: [HANAKO], 2026: [HANAKO] },
      parseHeaderPath("/p/sample-hanako/2025"),
    );

    expect(items[0].isCurrent).toBe(true);
    expect(items[0].href).toBe("/p/sample-hanako/2025");
    expect(items[0].years.find((year) => year.isSelected)?.year).toBe(2025);
  });

  it("一覧に無い議員（調研費が非公開）は、プレビュー URL で見ていても出さない", () => {
    const items = buildPoliticianMenuItems(
      { 2025: [], 2026: [TARO] },
      parseHeaderPath(`/p/secret-jiro~${PREVIEW_TOKEN}/2026`),
    );

    expect(items.map((item) => item.slug)).toEqual(["sample-taro"]);
    expect(items[0].isCurrent).toBe(false);
  });

  it("slug はエンコードして URL にする", () => {
    const items = buildPoliticianMenuItems(
      { 2026: [{ slug: "a/b", name: "テスト" }] },
      parseHeaderPath("/"),
    );

    expect(items[0].href).toBe("/p/a%2Fb/2026");
  });
});
