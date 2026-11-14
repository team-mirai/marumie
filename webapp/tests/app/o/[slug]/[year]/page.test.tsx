jest.mock("next/navigation", () => ({ redirect: jest.fn() }));
jest.mock("@/server/contexts/public-finance/presentation/loaders/load-organizations", () => ({
  loadOrganizations: jest.fn(),
}));
jest.mock("@/server/contexts/public-finance/presentation/loaders/load-top-page-data", () => ({
  loadTopPageData: jest.fn(),
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
jest.mock("@/client/components/top-page/PartyHeadingSection", () =>
  mockComponent("PartyHeadingSection"),
);
jest.mock("@/client/components/top-page/TransactionsSection", () =>
  mockComponent("TransactionsSection"),
);

import { Children, isValidElement, type ReactElement, type ReactNode } from "react";
import OrgPage from "@/app/o/[slug]/[year]/page";
import { loadOrganizations } from "@/server/contexts/public-finance/presentation/loaders/load-organizations";
import { loadTopPageData } from "@/server/contexts/public-finance/presentation/loaders/load-top-page-data";

const loadOrganizationsMock = loadOrganizations as jest.Mock;
const loadTopPageDataMock = loadTopPageData as jest.Mock;

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

async function renderSections(year = "2026") {
  const page = (await OrgPage({
    params: Promise.resolve({ slug: "team-mirai", year }),
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
