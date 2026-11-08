jest.mock("next/navigation", () => ({
  redirect: jest.fn(),
  notFound: jest.fn(),
}));
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
import OrgPage, { generateMetadata } from "@/app/o/[slug]/[year]/page";
import ResearchFundPartySection from "@/client/components/research-fund/ResearchFundPartySection";
import { notFound } from "next/navigation";
import { loadOrganizations } from "@/server/contexts/public-finance/presentation/loaders/load-organizations";
import { loadTopPageData } from "@/server/contexts/public-finance/presentation/loaders/load-top-page-data";
import { loadResearchFundPartySummary } from "@/server/contexts/research-fund/presentation/loaders/load-research-fund-party-summary";

const notFoundMock = jest.mocked(notFound);
const loadOrganizationsMock = loadOrganizations as jest.Mock;
const loadTopPageDataMock = loadTopPageData as jest.Mock;
const loadResearchFundPartySummaryMock = loadResearchFundPartySummary as jest.Mock;

const defaultParams = Promise.resolve({ slug: "team-mirai", year: "2026" });

async function renderSections(params = defaultParams): Promise<ReactElement[]> {
  const page = (await OrgPage({ params })) as ReactElement<{ children: ReactElement[] }>;
  return page.props.children.filter(Boolean);
}

describe("OrgPage", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    loadOrganizationsMock.mockResolvedValue({
      default: "team-mirai",
      organizations: [{ slug: "team-mirai", orgName: null, displayName: "チームみらい" }],
    });
    loadTopPageDataMock.mockResolvedValue(null);
    loadResearchFundPartySummaryMock.mockResolvedValue({ asOfDate: null });
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
        params: Promise.resolve({ slug: "team-mirai", year: "2020" }),
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
      await OrgPage({ params: Promise.resolve({ slug: "team-mirai", year: "invalid-year" }) });
      expect(notFoundMock).toHaveBeenCalled();
    });

    it("年度が4桁でない場合（前置ゼロ付き等）は notFound() を呼び出す", async () => {
      await OrgPage({ params: Promise.resolve({ slug: "team-mirai", year: "02026" }) });
      expect(notFoundMock).toHaveBeenCalled();
    });

    it("年度が対象外（VALID_YEARS外）の場合は notFound() を呼び出す", async () => {
      await OrgPage({ params: Promise.resolve({ slug: "team-mirai", year: "2020" }) });
      expect(notFoundMock).toHaveBeenCalled();
    });

    it("存在しない slug の場合は notFound() を呼び出す", async () => {
      await OrgPage({ params: Promise.resolve({ slug: "unknown-org", year: "2026" }) });
      expect(notFoundMock).toHaveBeenCalled();
    });
  });

  describe("調査研究費セクション", () => {
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
});
