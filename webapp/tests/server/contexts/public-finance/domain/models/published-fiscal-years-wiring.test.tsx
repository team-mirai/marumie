/**
 * 公開している年度の定義（PublishedFiscalYears）に年度を 1 つ足すだけで、
 * トップページ・政治団体ページ・取引一覧・年度なし URL のリダイレクト・サイトマップ・ヘッダーのすべてに反映されることを確かめる。
 * 定義を 2027年まで公開している状態に差し替え、各ページが 2027年を扱うかを見る。
 */
jest.mock("@/server/contexts/public-finance/domain/models/published-fiscal-years", () => {
  const years = [2025, 2026, 2027];
  return {
    PublishedFiscalYears: {
      all: years,
      defaultYear: 2027,
      includes: (year: number) => years.includes(year),
    },
  };
});

/** redirect は本物と同じく投げて、その後の処理を止める */
class RedirectError extends Error {
  constructor(readonly url: string) {
    super(`redirect: ${url}`);
  }
}
jest.mock("next/navigation", () => ({
  redirect: jest.fn((url: string) => {
    throw new RedirectError(url);
  }),
  notFound: jest.fn(),
}));

jest.mock("@/server/contexts/public-finance/presentation/loaders/load-organizations", () => ({
  loadOrganizations: jest.fn(),
}));
jest.mock("@/server/contexts/public-finance/presentation/loaders/load-home-page-data", () => ({
  loadHomePageData: jest.fn(),
}));
jest.mock("@/server/contexts/public-finance/presentation/loaders/load-top-page-data", () => ({
  loadTopPageData: jest.fn(),
}));
jest.mock("@/server/contexts/public-finance/presentation/loaders/load-organization-profile", () => ({
  loadOrganizationProfile: jest.fn(),
}));
jest.mock("@/server/contexts/public-finance/presentation/loaders/load-transactions-page-data", () => ({
  loadTransactionsPageData: jest.fn(),
}));
jest.mock(
  "@/server/contexts/research-fund/presentation/loaders/load-research-fund-home-summary",
  () => ({ loadResearchFundHomeSummary: jest.fn() }),
);
jest.mock(
  "@/server/contexts/research-fund/presentation/loaders/load-research-fund-coming-soon-politicians",
  () => ({ loadResearchFundComingSoonPoliticians: jest.fn() }),
);
jest.mock(
  "@/server/contexts/research-fund/presentation/loaders/load-research-fund-politicians",
  () => ({ loadResearchFundPoliticians: jest.fn() }),
);
jest.mock(
  "@/server/contexts/research-fund/presentation/loaders/load-published-research-fund-pages",
  () => ({ loadPublishedResearchFundPages: jest.fn() }),
);

// 描画はしないので、重い UI ライブラリを読み込む子コンポーネントは差し替える。
function mockComponent(name: string) {
  const component = () => null;
  Object.defineProperty(component, "name", { value: name });
  return { __esModule: true, default: component };
}
jest.mock("@/client/components/common/SiteBottomBlock", () => mockComponent("SiteBottomBlock"));
jest.mock("@/client/components/common/ResearchFundSurveyCard", () =>
  mockComponent("ResearchFundSurveyCard"),
);
jest.mock("@/client/components/common/TransparencySection", () =>
  mockComponent("TransparencySection"),
);
jest.mock("@/client/components/home/HomeOrganizationCard", () =>
  mockComponent("HomeOrganizationCard"),
);
jest.mock("@/client/components/home/HomeResearchFundSection", () =>
  mockComponent("HomeResearchFundSection"),
);
jest.mock("@/client/components/home/HomeSectionHeading", () => mockComponent("HomeSectionHeading"));
jest.mock("@/client/components/home/OrganizationAvatar", () => mockComponent("OrganizationAvatar"));
jest.mock("@/client/components/layout/Breadcrumbs", () => mockComponent("Breadcrumbs"));
jest.mock("@/client/components/layout/RevealOnScroll", () => mockComponent("RevealOnScroll"));
jest.mock("@/client/components/layout/SectionCard", () => mockComponent("SectionCard"));
jest.mock("@/client/components/layout/header/HeaderClient", () => mockComponent("HeaderClient"));
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
jest.mock(
  "@/client/components/top-page/features/transactions-table/InteractiveTransactionTable",
  () => mockComponent("InteractiveTransactionTable"),
);

import { Children, isValidElement, type ReactElement, type ReactNode } from "react";
import HomePage from "@/app/page";
import OrgRedirectPage from "@/app/o/[slug]/page";
import OrgTransactionsRedirectPage from "@/app/o/[slug]/transactions/page";
import OrgPage from "@/app/o/[slug]/[year]/page";
import TransactionsPage from "@/app/o/[slug]/[year]/transactions/page";
import PoliticianYearRedirect from "@/app/p/[slug]/page";
import sitemap from "@/app/sitemap";
import Header from "@/client/components/layout/header/Header";
import { buildOrganizationMenuItems } from "@/client/lib/header-navigation";
import { loadHomePageData } from "@/server/contexts/public-finance/presentation/loaders/load-home-page-data";
import { loadOrganizations } from "@/server/contexts/public-finance/presentation/loaders/load-organizations";
import { loadTopPageData } from "@/server/contexts/public-finance/presentation/loaders/load-top-page-data";
import { loadTransactionsPageData } from "@/server/contexts/public-finance/presentation/loaders/load-transactions-page-data";
import { loadPublishedResearchFundPages } from "@/server/contexts/research-fund/presentation/loaders/load-published-research-fund-pages";
import { loadResearchFundComingSoonPoliticians } from "@/server/contexts/research-fund/presentation/loaders/load-research-fund-coming-soon-politicians";
import { loadResearchFundHomeSummary } from "@/server/contexts/research-fund/presentation/loaders/load-research-fund-home-summary";
import { loadResearchFundPoliticians } from "@/server/contexts/research-fund/presentation/loaders/load-research-fund-politicians";

const loadOrganizationsMock = loadOrganizations as jest.Mock;
const loadHomePageDataMock = loadHomePageData as jest.Mock;
const loadTopPageDataMock = loadTopPageData as jest.Mock;
const loadTransactionsPageDataMock = loadTransactionsPageData as jest.Mock;
const loadResearchFundHomeSummaryMock = loadResearchFundHomeSummary as jest.Mock;
const loadResearchFundComingSoonPoliticiansMock = loadResearchFundComingSoonPoliticians as jest.Mock;
const loadResearchFundPoliticiansMock = loadResearchFundPoliticians as jest.Mock;
const loadPublishedResearchFundPagesMock = loadPublishedResearchFundPages as jest.Mock;

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

function propsOf(node: ReactNode, name: string): Record<string, unknown> | undefined {
  return flatten(node).find((element) => element.name === name)?.props;
}

/** redirect した先の URL。redirect しなければ null */
async function redirectedTo(render: () => Promise<unknown>): Promise<string | null> {
  try {
    await render();
    return null;
  } catch (error) {
    if (error instanceof RedirectError) return error.url;
    throw error;
  }
}

const organizations = [
  { slug: "team-mirai", orgName: null, displayName: "チームみらい", kind: "party", hasPhoto: false },
];

beforeEach(() => {
  jest.clearAllMocks();
  loadOrganizationsMock.mockResolvedValue({ default: "team-mirai", organizations });
  loadHomePageDataMock.mockResolvedValue({
    lastUpdatedAt: null,
    parties: [{ slug: "team-mirai", displayName: "チームみらい", hasPhoto: false, years: [] }],
    groups: [],
  });
  loadTopPageDataMock.mockResolvedValue(null);
  loadTransactionsPageDataMock.mockResolvedValue({
    politicalOrganizations: [{ slug: "team-mirai", displayName: "チームみらい" }],
    transactions: [],
    total: 0,
    page: 1,
    perPage: 50,
    totalPages: 0,
    lastUpdatedAt: null,
  });
  loadResearchFundHomeSummaryMock.mockResolvedValue(null);
  loadResearchFundComingSoonPoliticiansMock.mockResolvedValue([]);
  loadResearchFundPoliticiansMock.mockResolvedValue([]);
  loadPublishedResearchFundPagesMock.mockResolvedValue([]);
});

describe("公開している年度に 2027年を足すと", () => {
  it("トップページは 2027年までを集計し、2027年を最初に見せる", async () => {
    const page = (await HomePage()) as ReactElement<{ children: ReactNode }>;

    expect(loadHomePageDataMock).toHaveBeenCalledWith([2025, 2026, 2027]);
    expect(loadResearchFundHomeSummaryMock).toHaveBeenCalledWith({
      financialYear: 2027,
      years: [2025, 2026, 2027],
    });
    expect(propsOf(page.props.children, "HomeOrganizationCard")?.defaultYear).toBe(2027);
  });

  it("政治団体ページは 2027年を表示でき、年度の切り替えに 2027年を並べる", async () => {
    const page = (await OrgPage({
      params: Promise.resolve({ slug: "team-mirai", year: "2027" }),
    })) as ReactElement<{ children: ReactNode }>;

    expect(loadTopPageDataMock).toHaveBeenCalledWith(
      expect.objectContaining({ financialYear: 2027 }),
    );
    expect(propsOf(page.props.children, "PartyHeadingSection")?.years).toEqual([2025, 2026, 2027]);
  });

  it("政治団体ページは公開していない年度を 2027年へ寄せる", async () => {
    await expect(
      redirectedTo(() => OrgPage({ params: Promise.resolve({ slug: "team-mirai", year: "2024" }) })),
    ).resolves.toBe("/o/team-mirai/2027");
  });

  it("取引一覧は 2027年を表示でき、公開していない年度を 2027年へ寄せる", async () => {
    await TransactionsPage({
      params: Promise.resolve({ slug: "team-mirai", year: "2027" }),
      searchParams: Promise.resolve({}),
    });
    expect(loadTransactionsPageDataMock).toHaveBeenCalledWith(
      expect.objectContaining({ financialYear: 2027 }),
    );

    await expect(
      redirectedTo(() =>
        TransactionsPage({
          params: Promise.resolve({ slug: "team-mirai", year: "2024" }),
          searchParams: Promise.resolve({}),
        }),
      ),
    ).resolves.toBe("/o/team-mirai/2027/transactions");
  });

  it("年度なしの URL は 2027年へリダイレクトする", async () => {
    const params = Promise.resolve({ slug: "team-mirai" });

    await expect(redirectedTo(() => OrgRedirectPage({ params }))).resolves.toBe(
      "/o/team-mirai/2027",
    );
    await expect(redirectedTo(() => OrgTransactionsRedirectPage({ params }))).resolves.toBe(
      "/o/team-mirai/2027/transactions",
    );
    await expect(
      redirectedTo(() => PoliticianYearRedirect({ params: Promise.resolve({ slug: "sample-taro" }) })),
    ).resolves.toBe("/p/sample-taro/2027");
  });

  it("サイトマップに 2027年の政治団体ページと取引一覧を載せる", async () => {
    const urls = (await sitemap()).map((entry) => entry.url);

    expect(urls.some((url) => url.endsWith("/o/team-mirai/2027"))).toBe(true);
    expect(urls.some((url) => url.endsWith("/o/team-mirai/2027/transactions"))).toBe(true);
  });

  it("ヘッダーは 2027年の議員も取り、政治団体の年の切り替えに 2027年を並べて既定の行き先を 2027年にする", async () => {
    await Header();
    expect(loadResearchFundPoliticiansMock.mock.calls.map(([arg]) => arg.financialYear)).toEqual([
      2025, 2026, 2027,
    ]);

    const [item] = buildOrganizationMenuItems(
      [{ slug: "team-mirai", displayName: "チームみらい", orgName: null, kind: "party", hasPhoto: false }],
      { kind: "other" },
    );
    expect(item.href).toBe("/o/team-mirai/2027");
    expect(item.years.map(({ year }) => year)).toEqual([2025, 2026, 2027]);
  });
});
