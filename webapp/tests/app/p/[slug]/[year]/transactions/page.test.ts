jest.mock("@/server/contexts/research-fund/presentation/loaders/load-research-fund-page", () => ({
  loadResearchFundPage: jest.fn(),
}));

import { generateMetadata } from "@/app/p/[slug]/[year]/transactions/page";
import { loadResearchFundPage } from "@/server/contexts/research-fund/presentation/loaders/load-research-fund-page";
import { deriveResearchFundPreviewToken } from "@/shared/research-fund/preview-token";

const loadResearchFundPageMock = loadResearchFundPage as jest.Mock;

const SECRET = "test-secret";
const TOKEN = deriveResearchFundPreviewToken(SECRET, "sample-taro");
const politician = { name: "サンプル太郎", slug: "sample-taro" };
const metadataOf = (slug: string) =>
  generateMetadata({
    params: Promise.resolve({ slug, year: "2026" }),
    searchParams: Promise.resolve({}),
  });

beforeEach(() => {
  process.env.RESEARCH_FUND_PREVIEW_SECRET = SECRET;
});

afterAll(() => {
  delete process.env.RESEARCH_FUND_PREVIEW_SECRET;
});

describe("議員の全件ページの metadata", () => {
  it("調研費を公開する議員なら noindex を付けない", async () => {
    loadResearchFundPageMock.mockResolvedValue({ politician, isPublic: true });

    const metadata = await metadataOf("sample-taro");

    expect(metadata.robots).toBeUndefined();
  });

  it("プレビュー URL で開いたページには noindex を付ける", async () => {
    loadResearchFundPageMock.mockResolvedValue({ politician, isPublic: false });

    const metadata = await metadataOf(`sample-taro~${TOKEN}`);

    expect(metadata.title).toBe(
      "サンプル太郎の調査研究費：すべての出入金 - みらいまる見え政治資金",
    );
    expect(metadata.robots).toEqual({ index: false });
  });

  it("調研費を公開しない議員を文字列なしで開くと、議員名を出さない", async () => {
    loadResearchFundPageMock.mockResolvedValue({ politician, isPublic: false });

    const metadata = await metadataOf("sample-taro");

    expect(metadata.title).toBe("みらいまる見え政治資金");
  });
});
