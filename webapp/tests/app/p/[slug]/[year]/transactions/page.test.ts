jest.mock("@/server/contexts/research-fund/presentation/loaders/load-research-fund-page", () => ({
  loadResearchFundPage: jest.fn(),
}));

import { generateMetadata } from "@/app/p/[slug]/[year]/transactions/page";
import { loadResearchFundPage } from "@/server/contexts/research-fund/presentation/loaders/load-research-fund-page";

const loadResearchFundPageMock = loadResearchFundPage as jest.Mock;

const params = Promise.resolve({ slug: "sample-taro", year: "2026" });
const politician = { name: "サンプル太郎", slug: "sample-taro" };

describe("議員の全件ページの metadata", () => {
  it("調研費を公開する議員なら noindex を付けない", async () => {
    loadResearchFundPageMock.mockResolvedValue({ politician, isPublic: true });

    const metadata = await generateMetadata({ params, searchParams: Promise.resolve({}) });

    expect(metadata.robots).toBeUndefined();
  });

  it("調研費を公開しない議員なら noindex を付ける", async () => {
    loadResearchFundPageMock.mockResolvedValue({ politician, isPublic: false });

    const metadata = await generateMetadata({ params, searchParams: Promise.resolve({}) });

    expect(metadata.robots).toEqual({ index: false });
  });
});
