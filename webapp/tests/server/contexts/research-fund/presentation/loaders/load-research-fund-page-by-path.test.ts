jest.mock("@/server/contexts/research-fund/presentation/loaders/load-research-fund-page", () => ({
  loadResearchFundPage: jest.fn(),
}));

import { loadResearchFundPage } from "@/server/contexts/research-fund/presentation/loaders/load-research-fund-page";
import { loadResearchFundPageByPath } from "@/server/contexts/research-fund/presentation/loaders/load-research-fund-page-by-path";
import { deriveResearchFundPreviewToken } from "@/shared/research-fund/preview-token";

const loadResearchFundPageMock = loadResearchFundPage as jest.Mock;

const SECRET = "test-secret";
const TOKEN = deriveResearchFundPreviewToken(SECRET, "sample-taro");
const politician = { name: "サンプル太郎", slug: "sample-taro" };

describe("loadResearchFundPageByPath", () => {
  beforeEach(() => {
    process.env.RESEARCH_FUND_PREVIEW_SECRET = SECRET;
    loadResearchFundPageMock.mockReset();
  });

  afterAll(() => {
    delete process.env.RESEARCH_FUND_PREVIEW_SECRET;
  });

  it("公開する議員は文字列なしの slug でそのまま引ける", async () => {
    const data = { politician, isPublic: true };
    loadResearchFundPageMock.mockResolvedValue(data);

    expect(await loadResearchFundPageByPath({ pathSlug: "sample-taro", financialYear: 2026 })).toEqual(
      { data, pathSlug: "sample-taro", isPreview: false },
    );
  });

  it("プレビュー URL は slug でデータを引き、ページ内のリンク用に文字列ごとの区間を返す", async () => {
    const data = { politician, isPublic: false };
    loadResearchFundPageMock.mockResolvedValue(data);

    const page = await loadResearchFundPageByPath({
      pathSlug: `sample-taro~${TOKEN}`,
      financialYear: 2026,
    });

    expect(loadResearchFundPageMock).toHaveBeenCalledWith({ slug: "sample-taro", financialYear: 2026 });
    expect(page).toEqual({ data, pathSlug: `sample-taro~${TOKEN}`, isPreview: true });
  });

  it("公開しない議員を文字列なしで引くと null", async () => {
    loadResearchFundPageMock.mockResolvedValue({ politician, isPublic: false });

    expect(await loadResearchFundPageByPath({ pathSlug: "sample-taro", financialYear: 2026 })).toBeNull();
  });

  it("存在しない議員は null", async () => {
    loadResearchFundPageMock.mockResolvedValue(null);

    expect(
      await loadResearchFundPageByPath({ pathSlug: `sample-taro~${TOKEN}`, financialYear: 2026 }),
    ).toBeNull();
  });
});
