jest.mock("@/server/contexts/research-fund/presentation/loaders/load-research-fund-page", () => ({
  loadResearchFundPage: jest.fn(),
}));
// metadata だけを確かめるので、重い UI ライブラリを読み込む子コンポーネントは差し替える。
jest.mock("@/client/components/common/AboutSection", () => ({ __esModule: true, default: () => null }));
jest.mock("@/client/components/common/LinkCardsSection", () => ({ __esModule: true, default: () => null }));
jest.mock("@/client/components/common/GradientMessageCard", () => ({ __esModule: true, default: () => null }));
jest.mock("@/client/components/layout/MainColumn", () => ({ __esModule: true, default: () => null }));
jest.mock("@/client/components/research-fund/ResearchFundAboutSection", () => ({ __esModule: true, default: () => null }));
jest.mock("@/client/components/research-fund/ResearchFundExpensesSection", () => ({ __esModule: true, default: () => null }));
jest.mock("@/client/components/research-fund/ResearchFundFlowSection", () => ({ __esModule: true, default: () => null }));
jest.mock("@/client/components/research-fund/ResearchFundHighlightsSection", () => ({ __esModule: true, default: () => null }));
jest.mock("@/client/components/research-fund/ResearchFundMonthlySection", () => ({ __esModule: true, default: () => null }));
jest.mock("@/client/components/research-fund/ResearchFundPartyLinkSection", () => ({ __esModule: true, default: () => null }));
jest.mock("@/client/components/research-fund/ResearchFundTrialNoticeSection", () => ({ __esModule: true, default: () => null }));
jest.mock("@/client/components/research-fund/ResearchFundCrossLink", () => ({
  ResearchFundCrossLinkProvider: () => null,
}));

import { generateMetadata } from "@/app/p/[slug]/[year]/page";
import { loadResearchFundPage } from "@/server/contexts/research-fund/presentation/loaders/load-research-fund-page";

const loadResearchFundPageMock = loadResearchFundPage as jest.Mock;

const params = Promise.resolve({ slug: "sample-taro", year: "2026" });
const politician = { name: "サンプル太郎", slug: "sample-taro" };

describe("議員ページの metadata", () => {
  it("調研費を公開する議員なら noindex を付けない", async () => {
    loadResearchFundPageMock.mockResolvedValue({ politician, isPublic: true });

    const metadata = await generateMetadata({ params });

    expect(metadata.title).toBe("サンプル太郎の調研費 - みらいまる見え政治資金");
    expect(metadata.robots).toBeUndefined();
  });

  it("調研費を公開しない議員なら、ページは返しつつ noindex を付ける", async () => {
    loadResearchFundPageMock.mockResolvedValue({ politician, isPublic: false });

    const metadata = await generateMetadata({ params });

    expect(metadata.title).toBe("サンプル太郎の調研費 - みらいまる見え政治資金");
    expect(metadata.robots).toEqual({ index: false });
  });
});
