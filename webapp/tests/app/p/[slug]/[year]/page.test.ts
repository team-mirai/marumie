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

import PoliticianPage, { generateMetadata } from "@/app/p/[slug]/[year]/page";
import { loadResearchFundPage } from "@/server/contexts/research-fund/presentation/loaders/load-research-fund-page";
import { deriveResearchFundPreviewToken } from "@/shared/research-fund/preview-token";

const loadResearchFundPageMock = loadResearchFundPage as jest.Mock;

const SECRET = "test-secret";
const TOKEN = deriveResearchFundPreviewToken(SECRET, "sample-taro");
const politician = { name: "サンプル太郎", slug: "sample-taro" };
const paramsOf = (slug: string) => Promise.resolve({ slug, year: "2026" });

beforeEach(() => {
  process.env.RESEARCH_FUND_PREVIEW_SECRET = SECRET;
  loadResearchFundPageMock.mockReset();
});

afterAll(() => {
  delete process.env.RESEARCH_FUND_PREVIEW_SECRET;
});

describe("議員ページの metadata", () => {
  it("調研費を公開する議員なら noindex を付けない", async () => {
    loadResearchFundPageMock.mockResolvedValue({ politician, isPublic: true });

    const metadata = await generateMetadata({ params: paramsOf("sample-taro") });

    expect(metadata.title).toBe("サンプル太郎の調研費 - みらいまる見え政治資金");
    expect(metadata.robots).toBeUndefined();
  });

  it("プレビュー URL で開いたページには noindex を付ける", async () => {
    loadResearchFundPageMock.mockResolvedValue({ politician, isPublic: false });

    const metadata = await generateMetadata({ params: paramsOf(`sample-taro~${TOKEN}`) });

    expect(loadResearchFundPageMock).toHaveBeenCalledWith({ slug: "sample-taro", financialYear: 2026 });
    expect(metadata.title).toBe("サンプル太郎の調研費 - みらいまる見え政治資金");
    expect(metadata.robots).toEqual({ index: false });
  });

  it("調研費を公開しない議員を文字列なしで開くと、存在しない議員と同じタイトルになる", async () => {
    loadResearchFundPageMock.mockResolvedValue({ politician, isPublic: false });
    const hidden = await generateMetadata({ params: paramsOf("sample-taro") });

    loadResearchFundPageMock.mockResolvedValue(null);
    const missing = await generateMetadata({ params: paramsOf("nobody") });

    expect(hidden).toEqual(missing);
  });
});

describe("議員ページ", () => {
  it("調研費を公開しない議員は、文字列なしでは 404 にする", async () => {
    loadResearchFundPageMock.mockResolvedValue({ politician, isPublic: false });

    await expect(PoliticianPage({ params: paramsOf("sample-taro") })).rejects.toThrow(
      "NEXT_HTTP_ERROR_FALLBACK;404",
    );
  });

  it("文字列が間違っていれば 404 にする", async () => {
    loadResearchFundPageMock.mockResolvedValue({ politician, isPublic: false });

    await expect(
      PoliticianPage({ params: paramsOf(`sample-taro~${"0".repeat(32)}`) }),
    ).rejects.toThrow("NEXT_HTTP_ERROR_FALLBACK;404");
  });

  it("環境変数が未設定なら、正しかった文字列でも 404 にする", async () => {
    delete process.env.RESEARCH_FUND_PREVIEW_SECRET;
    loadResearchFundPageMock.mockResolvedValue({ politician, isPublic: false });

    await expect(PoliticianPage({ params: paramsOf(`sample-taro~${TOKEN}`) })).rejects.toThrow(
      "NEXT_HTTP_ERROR_FALLBACK;404",
    );
  });
});
