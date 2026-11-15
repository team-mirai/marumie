const notFoundError = new Error("NEXT_HTTP_ERROR_FALLBACK;404");
const notFoundMock = jest.fn(() => {
  throw notFoundError;
});
jest.mock("next/navigation", () => ({
  notFound: () => notFoundMock(),
}));
jest.mock("@/server/contexts/public-finance/presentation/loaders/load-organizations", () => ({
  loadOrganizations: jest.fn(),
}));
jest.mock("@/server/contexts/public-finance/presentation/loaders/load-top-page-data", () => ({
  loadTopPageData: jest.fn(),
}));
jest.mock("@/server/contexts/public-finance/presentation/loaders/load-organization-profile", () => ({
  loadOrganizationProfile: jest.fn(),
}));
// 描画はしないので、重い UI ライブラリを読み込む子コンポーネントは差し替える。
function mockComponent(name: string) {
  const component = () => null;
  Object.defineProperty(component, "name", { value: name });
  return { __esModule: true, default: component };
}
jest.mock("@/client/components/common/SiteBottomBlock", () => mockComponent("SiteBottomBlock"));
jest.mock("@/client/components/common/TransparencySection", () =>
  mockComponent("TransparencySection"),
);
jest.mock("@/client/components/layout/Breadcrumbs", () => mockComponent("Breadcrumbs"));
jest.mock("@/client/components/top-page/BalanceSheetSection", () =>
  mockComponent("BalanceSheetSection"),
);
jest.mock("@/client/components/top-page/MonthlyTrendsSection", () =>
  mockComponent("MonthlyTrendsSection"),
);
jest.mock("@/client/components/top-page/OrganizationCashFlowSection", () =>
  mockComponent("OrganizationCashFlowSection"),
);
jest.mock("@/client/components/top-page/OrganizationHeadingSection", () =>
  mockComponent("OrganizationHeadingSection"),
);
jest.mock("@/client/components/top-page/PartyHeadingSection", () =>
  mockComponent("PartyHeadingSection"),
);
jest.mock("@/client/components/top-page/TransactionsSection", () =>
  mockComponent("TransactionsSection"),
);

import { Children, isValidElement, type ReactElement, type ReactNode } from "react";
import OrgPage, { generateMetadata } from "@/app/o/[slug]/[year]/page";
import { loadOrganizations } from "@/server/contexts/public-finance/presentation/loaders/load-organizations";
import { loadOrganizationProfile } from "@/server/contexts/public-finance/presentation/loaders/load-organization-profile";
import { loadTopPageData } from "@/server/contexts/public-finance/presentation/loaders/load-top-page-data";

const loadOrganizationsMock = loadOrganizations as jest.Mock;
const loadTopPageDataMock = loadTopPageData as jest.Mock;
const loadOrganizationProfileMock = loadOrganizationProfile as jest.Mock;

/** ページの要素を上から順に平らにして、差し替えたコンポーネントの名前と props を返す */
function flatten(node: ReactNode): { name: string; props: Record<string, unknown> }[] {
  return Children.toArray(node).flatMap((child) => {
    if (!isValidElement<{ children?: ReactNode }>(child)) return [];
    if (typeof child.type === "function") {
      return [{ name: child.type.name, props: child.props as Record<string, unknown> }];
    }
    return flatten(child.props.children);
  });
}

async function renderSections(year = "2026", slug = "team-mirai") {
  const page = (await OrgPage({
    params: Promise.resolve({ slug, year }),
  })) as ReactElement<{ children: ReactNode }>;
  return flatten(page.props.children);
}

describe("OrgPage（政党ページ）", () => {
  beforeEach(() => {
    notFoundMock.mockClear();
    loadOrganizationsMock.mockResolvedValue({
      default: "team-mirai",
      organizations: [{ slug: "team-mirai", orgName: null, displayName: "チームみらい" }],
    });
    loadTopPageDataMock.mockResolvedValue(null);
  });

  it("パンくず・見出しカードの後に、デザインどおりの順でセクションを並べる", async () => {
    const sections = await renderSections();

    expect(sections.map((section) => section.name)).toEqual([
      "Breadcrumbs",
      "PartyHeadingSection",
      "MonthlyTrendsSection",
      "TransparencySection",
      "BalanceSheetSection",
      "TransactionsSection",
      "SiteBottomBlock",
    ]);
  });

  it("パンくずと見出しカードに団体名と年を渡す", async () => {
    const sections = await renderSections("2025");

    expect(sections.find((s) => s.name === "Breadcrumbs")?.props).toEqual({
      current: "チームみらいの収支",
    });
    expect(sections.find((s) => s.name === "PartyHeadingSection")?.props).toMatchObject({
      organizationName: "チームみらい",
      slug: "team-mirai",
      year: 2025,
      years: [2025, 2026],
    });
    expect(sections.find((s) => s.name === "MonthlyTrendsSection")?.props).toMatchObject({
      eyebrow: "チームみらい・2025年",
    });
  });

  it("過去年度の貸借対照表には年度末の基準日を出す", async () => {
    const sections = await renderSections("2025");

    expect(sections.find((s) => s.name === "BalanceSheetSection")?.props).toMatchObject({
      updatedAt: "2025.12.31時点",
    });
  });
});

describe("OrgPage（政治団体ページ）", () => {
  beforeEach(() => {
    loadOrganizationsMock.mockResolvedValue({
      default: "team-mirai",
      organizations: [
        { slug: "team-mirai", orgName: null, displayName: "チームみらい" },
        { slug: "digimin", orgName: "デジタル民主主義を考える会", displayName: "安野貴博の政治団体" },
      ],
    });
    loadTopPageDataMock.mockResolvedValue(null);
    loadOrganizationProfileMock.mockResolvedValue({
      websiteUrl: "https://example.com/",
      snsUrls: ["https://x.com/example"],
      photoVersion: "abc",
    });
  });

  it("パンくず・見出しカードの後に、収支の流れ → 毎月の収支推移 → 貸借対照表 → すべての出入金の順で並べる", async () => {
    const sections = await renderSections("2026", "digimin");

    expect(sections.map((section) => section.name)).toEqual([
      "Breadcrumbs",
      "OrganizationHeadingSection",
      "OrganizationCashFlowSection",
      "MonthlyTrendsSection",
      "BalanceSheetSection",
      "TransactionsSection",
      "SiteBottomBlock",
    ]);
  });

  it("見出しカードに団体名・正式名と年・写真・公式サイトと SNS・年の切り替えを渡す", async () => {
    const sections = await renderSections("2025", "digimin");

    expect(sections.find((s) => s.name === "Breadcrumbs")?.props).toEqual({
      current: "安野貴博の政治団体の収支",
    });
    expect(sections.find((s) => s.name === "OrganizationHeadingSection")?.props).toEqual({
      organizationName: "安野貴博の政治団体",
      subtitle: "デジタル民主主義を考える会・2025年",
      photoUrl: "/api/organizations/digimin/photo?v=abc",
      links: [
        { type: "site", url: "https://example.com/", label: "公式サイト" },
        { type: "sns", url: "https://x.com/example", label: "X", kind: "X" },
      ],
      years: [
        { year: 2025, href: "/o/digimin/2025" },
        { year: 2026, href: "/o/digimin/2026" },
      ],
      currentYear: 2025,
    });
    expect(sections.find((s) => s.name === "OrganizationCashFlowSection")?.props).toMatchObject({
      eyebrow: "安野貴博の政治団体・2025年",
    });
  });

  it("写真が未登録なら写真の URL を渡さない", async () => {
    loadOrganizationProfileMock.mockResolvedValue({ websiteUrl: null, snsUrls: [], photoVersion: null });

    const sections = await renderSections("2026", "digimin");

    expect(sections.find((s) => s.name === "OrganizationHeadingSection")?.props).toMatchObject({
      photoUrl: null,
      links: [],
    });
  });

  it("プロフィールの取得に失敗しても、写真とリンクなしで表示する", async () => {
    jest.spyOn(console, "error").mockImplementation(() => {});
    loadOrganizationProfileMock.mockRejectedValue(new Error("db down"));

    const sections = await renderSections("2026", "digimin");

    expect(sections.find((s) => s.name === "OrganizationHeadingSection")?.props).toMatchObject({
      photoUrl: null,
      links: [],
    });
  });
});

describe("OrgPage（404 バリデーション・メタデータ）", () => {
  beforeEach(() => {
    notFoundMock.mockClear();
    loadOrganizationsMock.mockResolvedValue({
      default: "team-mirai",
      organizations: [{ slug: "team-mirai", orgName: null, displayName: "チームみらい" }],
    });
    loadTopPageDataMock.mockResolvedValue(null);
  });

  describe("generateMetadata", () => {
    it("存在する slug かつ有効な年度でタイトルを生成する", async () => {
      const metadata = await generateMetadata({
        params: Promise.resolve({ slug: "team-mirai", year: "2026" }),
      });
      expect(metadata.title).toBe("チームみらい - みらいまる見え政治資金");
    });

    it("年度が数字でない場合はデフォルトタイトルを返す", async () => {
      const metadata = await generateMetadata({
        params: Promise.resolve({ slug: "team-mirai", year: "invalid-year" }),
      });
      expect(metadata.title).toBe("みらいまる見え政治資金");
    });

    it("年度が4桁でない場合はデフォルトタイトルを返す", async () => {
      const metadata = await generateMetadata({
        params: Promise.resolve({ slug: "team-mirai", year: "02026" }),
      });
      expect(metadata.title).toBe("みらいまる見え政治資金");
    });

    it("年度が対象外（VALID_YEARS外）の場合はデフォルトタイトルを返す", async () => {
      const metadata = await generateMetadata({
        params: Promise.resolve({ slug: "team-mirai", year: "2024" }),
      });
      expect(metadata.title).toBe("みらいまる見え政治資金");
    });

    it("存在しない slug の場合はデフォルトタイトルを返す", async () => {
      const metadata = await generateMetadata({
        params: Promise.resolve({ slug: "unknown-slug", year: "2026" }),
      });
      expect(metadata.title).toBe("みらいまる見え政治資金");
    });
  });

  describe("バリデーション", () => {
    it("年度が数字でない場合は notFound() を呼び出す", async () => {
      await expect(
        OrgPage({ params: Promise.resolve({ slug: "team-mirai", year: "2025abc" }) }),
      ).rejects.toThrow(notFoundError);
      expect(notFoundMock).toHaveBeenCalledTimes(1);
    });

    it("年度が4桁でない場合（前置ゼロ付き等）は notFound() を呼び出す", async () => {
      await expect(
        OrgPage({ params: Promise.resolve({ slug: "team-mirai", year: "02026" }) }),
      ).rejects.toThrow(notFoundError);
      expect(notFoundMock).toHaveBeenCalledTimes(1);
    });

    it("年度が対象外（VALID_YEARS外）の場合は notFound() を呼び出す", async () => {
      await expect(
        OrgPage({ params: Promise.resolve({ slug: "team-mirai", year: "2024" }) }),
      ).rejects.toThrow(notFoundError);
      expect(notFoundMock).toHaveBeenCalledTimes(1);
    });

    it("存在しない slug の場合は notFound() を呼び出す", async () => {
      await expect(
        OrgPage({ params: Promise.resolve({ slug: "unknown-org", year: "2026" }) }),
      ).rejects.toThrow(notFoundError);
      expect(notFoundMock).toHaveBeenCalledTimes(1);
    });
  });
});
