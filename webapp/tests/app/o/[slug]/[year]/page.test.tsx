jest.mock("next/navigation", () => ({ redirect: jest.fn() }));
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
jest.mock("@/client/components/layout/RevealOnScroll", () => mockComponent("RevealOnScroll"));
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
      "Breadcrumbs",
      "RevealOnScroll",
    ]);
  });

  it("政党ページの一言コメントの帯を出し、フッターのすぐ上にもパンくずを出す", async () => {
    const sections = await renderSections();

    expect(sections.find((s) => s.name === "TransparencySection")?.props).toEqual({
      variant: "party",
    });
    expect(sections.filter((s) => s.name === "Breadcrumbs").at(-1)?.props).toEqual({
      current: "チームみらいの収支",
      position: "bottom",
    });
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

  it("見出しカードの丸に、admin で登録した代表者の写真を出せるかを渡す", async () => {
    loadOrganizationsMock.mockResolvedValue({
      default: "team-mirai",
      organizations: [
        { slug: "team-mirai", orgName: null, displayName: "チームみらい", hasPhoto: true },
      ],
    });

    const sections = await renderSections();

    expect(sections.find((s) => s.name === "PartyHeadingSection")?.props).toMatchObject({
      hasPhoto: true,
    });
  });

  it("写真が未登録（配信できない）なら、見出しカードの丸を人型のアイコンにするよう渡す", async () => {
    const sections = await renderSections();

    expect(sections.find((s) => s.name === "PartyHeadingSection")?.props).toMatchObject({
      hasPhoto: false,
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

  it("パンくず・見出しカードの後に、収支の流れ → 月ごとの収支推移 → 貸借対照表 → すべての出入金の順で並べる", async () => {
    const sections = await renderSections("2026", "digimin");

    expect(sections.map((section) => section.name)).toEqual([
      "Breadcrumbs",
      "OrganizationHeadingSection",
      "OrganizationCashFlowSection",
      "MonthlyTrendsSection",
      "BalanceSheetSection",
      "TransactionsSection",
      "SiteBottomBlock",
      "Breadcrumbs",
      "RevealOnScroll",
    ]);
  });

  it("見出しカードに団体名・正式名と年・写真・公式サイトと SNS・年の切り替えを渡す", async () => {
    const sections = await renderSections("2025", "digimin");

    expect(sections.find((s) => s.name === "Breadcrumbs")?.props).toEqual({
      current: "安野貴博の政治団体の収支",
    });
    expect(sections.find((s) => s.name === "OrganizationHeadingSection")?.props).toEqual({
      organizationName: "安野貴博の政治団体",
      formalName: "デジタル民主主義を考える会",
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

describe("generateMetadata（シェアしたときのカード）", () => {
  beforeEach(() => {
    loadOrganizationsMock.mockResolvedValue({
      default: "team-mirai",
      organizations: [{ slug: "team-mirai", orgName: null, displayName: "チームみらい" }],
    });
  });

  const metadataFor = (slug: string, year: string) =>
    generateMetadata({ params: Promise.resolve({ slug, year }) });

  it("og:image と twitter:image を、その団体・その年の画像にする", async () => {
    const metadata = await metadataFor("team-mirai", "2025");

    expect(metadata.title).toBe("チームみらいの収支");
    expect(metadata.openGraph?.images).toEqual([
      expect.objectContaining({ url: "/o/team-mirai/2025/og-image", width: 1200, height: 630 }),
    ]);
    expect(metadata.twitter?.images).toEqual([
      expect.objectContaining({ url: "/o/team-mirai/2025/og-image" }),
    ]);
    // ページで openGraph を書くとルートの文言が消えるので、文言もいっしょに入れる
    expect(metadata.openGraph?.title).toBe("まる見え政治資金｜チームみらい");
  });

  it("団体が無ければルートの既定（トップの画像）のままにする", async () => {
    expect(await metadataFor("unknown", "2026")).toEqual({});
  });
});
