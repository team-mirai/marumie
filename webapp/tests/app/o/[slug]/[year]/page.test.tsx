jest.mock("next/navigation", () => ({ redirect: jest.fn() }));
jest.mock("@/server/contexts/public-finance/presentation/loaders/load-organizations", () => ({
  loadOrganizations: jest.fn(),
}));
jest.mock("@/server/contexts/public-finance/presentation/loaders/load-top-page-data", () => ({
  loadTopPageData: jest.fn(),
}));
jest.mock(
  "@/server/contexts/research-fund/presentation/loaders/load-research-fund-party-summary",
  () => ({ loadResearchFundPartySummary: jest.fn() }),
);
// 描画はしないので、重い UI ライブラリを読み込む子コンポーネントは差し替える。
jest.mock("@/client/components/common/AboutSection", () => ({ __esModule: true, default: () => null }));
jest.mock("@/client/components/common/LinkCardsSection", () => ({ __esModule: true, default: () => null }));
jest.mock("@/client/components/common/AnotherPageLinkSection", () => ({ __esModule: true, default: () => null }));
jest.mock("@/client/components/common/ExplanationSection", () => ({ __esModule: true, default: () => null }));
jest.mock("@/client/components/common/TransparencySection", () => ({ __esModule: true, default: () => null }));
jest.mock("@/client/components/top-page/BalanceSheetSection", () => ({ __esModule: true, default: () => null }));
jest.mock("@/client/components/top-page/CashFlowSection", () => ({ __esModule: true, default: () => null }));
jest.mock("@/client/components/top-page/MonthlyTrendsSection", () => ({ __esModule: true, default: () => null }));
jest.mock("@/client/components/top-page/ProgressSection", () => ({ __esModule: true, default: () => null }));
jest.mock("@/client/components/top-page/TransactionsSection", () => ({ __esModule: true, default: () => null }));
jest.mock("@/client/components/research-fund/ResearchFundPartySection", () => ({
  __esModule: true,
  default: function ResearchFundPartySection() {
    return null;
  },
}));

import type { ReactElement } from "react";
import OrgPage from "@/app/o/[slug]/[year]/page";
import ResearchFundPartySection from "@/client/components/research-fund/ResearchFundPartySection";
import { loadOrganizations } from "@/server/contexts/public-finance/presentation/loaders/load-organizations";
import { loadTopPageData } from "@/server/contexts/public-finance/presentation/loaders/load-top-page-data";
import { loadResearchFundPartySummary } from "@/server/contexts/research-fund/presentation/loaders/load-research-fund-party-summary";

const loadOrganizationsMock = loadOrganizations as jest.Mock;
const loadTopPageDataMock = loadTopPageData as jest.Mock;
const loadResearchFundPartySummaryMock = loadResearchFundPartySummary as jest.Mock;

const params = Promise.resolve({ slug: "team-mirai", year: "2026" });

async function renderSections(): Promise<ReactElement[]> {
  const page = (await OrgPage({ params })) as ReactElement<{ children: ReactElement[] }>;
  return page.props.children.filter(Boolean);
}

describe("OrgPage の調査研究費セクション", () => {
  beforeEach(() => {
    loadOrganizationsMock.mockResolvedValue({
      default: "team-mirai",
      organizations: [{ slug: "team-mirai", orgName: null, displayName: "チームみらい" }],
    });
    loadTopPageDataMock.mockResolvedValue(null);
    loadResearchFundPartySummaryMock.mockReset();
    loadResearchFundPartySummaryMock.mockResolvedValue({ asOfDate: null });
  });

  it("調研費を公開する所属議員がいればセクションを出す", async () => {
    const sections = await renderSections();

    expect(sections.some((section) => section.type === ResearchFundPartySection)).toBe(true);
    expect(loadResearchFundPartySummaryMock).toHaveBeenCalledWith({
      slug: "team-mirai",
      financialYear: 2026,
    });
  });

  it("調研費を公開する所属議員がいなければ（loader が null）セクションを出さない", async () => {
    loadResearchFundPartySummaryMock.mockResolvedValue(null);

    const sections = await renderSections();

    expect(sections.some((section) => section.type === ResearchFundPartySection)).toBe(false);
  });
});
