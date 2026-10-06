jest.mock("@/server/contexts/public-finance/presentation/loaders/load-organizations", () => ({
  loadOrganizations: jest.fn(),
}));
jest.mock(
  "@/server/contexts/research-fund/presentation/loaders/load-published-research-fund-pages",
  () => ({ loadPublishedResearchFundPages: jest.fn() }),
);

import sitemap from "@/app/sitemap";
import { loadOrganizations } from "@/server/contexts/public-finance/presentation/loaders/load-organizations";
import { loadPublishedResearchFundPages } from "@/server/contexts/research-fund/presentation/loaders/load-published-research-fund-pages";

const loadOrganizationsMock = loadOrganizations as jest.Mock;
const loadPublishedResearchFundPagesMock = loadPublishedResearchFundPages as jest.Mock;

const BASE_URL = process.env.WEBAPP_URL || "https://marumie.team-mir.ai";

describe("sitemap", () => {
  beforeEach(() => {
    loadOrganizationsMock.mockResolvedValue({
      default: "team-mirai",
      organizations: [{ slug: "team-mirai", orgName: null, displayName: "チームみらい" }],
    });
    loadPublishedResearchFundPagesMock.mockResolvedValue([]);
  });

  it("published の帳簿を持つ議員×年度を列挙する", async () => {
    loadPublishedResearchFundPagesMock.mockResolvedValue([
      { slug: "sample-taro", financialYear: 2025 },
      { slug: "sample-taro", financialYear: 2026 },
    ]);

    const urls = (await sitemap()).map((entry) => entry.url);

    expect(urls).toContain(`${BASE_URL}/p/sample-taro/2025`);
    expect(urls).toContain(`${BASE_URL}/p/sample-taro/2026`);
    expect(urls).toContain(`${BASE_URL}/p/sample-taro/2025/transactions`);
    expect(urls).toContain(`${BASE_URL}/p/sample-taro/2026/transactions`);
  });

  it("政治団体は年度ごとのトップページと全件ページを列挙し、リダイレクトするだけの URL は出さない", async () => {
    const urls = (await sitemap()).map((entry) => entry.url);

    expect(urls).toEqual([
      `${BASE_URL}/o/team-mirai/2025`,
      `${BASE_URL}/o/team-mirai/2025/transactions`,
      `${BASE_URL}/o/team-mirai/2026`,
      `${BASE_URL}/o/team-mirai/2026/transactions`,
    ]);
  });

  it("公開中の議員ページが無ければ /p/ の URL を出さない", async () => {
    const urls = (await sitemap()).map((entry) => entry.url);

    expect(urls.filter((url) => url.includes("/p/"))).toEqual([]);
  });
});
