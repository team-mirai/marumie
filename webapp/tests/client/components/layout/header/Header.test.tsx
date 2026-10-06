jest.mock("@/client/components/layout/header/HeaderClient", () => ({
  __esModule: true,
  default: jest.fn(),
}));
jest.mock("@/server/contexts/public-finance/presentation/loaders/load-organizations", () => ({
  loadOrganizations: jest.fn(),
}));
jest.mock(
  "@/server/contexts/research-fund/presentation/loaders/load-research-fund-politicians",
  () => ({ loadResearchFundPoliticians: jest.fn() }),
);

import Header from "@/client/components/layout/header/Header";
import { loadOrganizations } from "@/server/contexts/public-finance/presentation/loaders/load-organizations";
import { loadResearchFundPoliticians } from "@/server/contexts/research-fund/presentation/loaders/load-research-fund-politicians";

const loadOrganizationsMock = loadOrganizations as jest.Mock;
const loadResearchFundPoliticiansMock = loadResearchFundPoliticians as jest.Mock;

const POLITICIAN = { slug: "sample-taro", name: "サンプル太郎", statusLabel: "2026年2月〜8月分を公開中" };

describe("Header", () => {
  beforeEach(() => {
    loadOrganizationsMock.mockResolvedValue({ default: "team-mirai", organizations: [] });
    loadResearchFundPoliticiansMock.mockReset();
    loadResearchFundPoliticiansMock.mockResolvedValue([POLITICIAN]);
  });

  it("調研費を公開する議員を年度ごとにセレクターへ渡し、ナビに調査研究費を出す", async () => {
    const element = await Header();

    expect(element.props.politiciansByYear).toEqual({ 2025: [POLITICIAN], 2026: [POLITICIAN] });
    expect(element.props.showResearchFundNavigation).toBe(true);
  });

  it("調研費を公開する議員がいなければ、ナビの調査研究費を出さない", async () => {
    loadResearchFundPoliticiansMock.mockResolvedValue([]);

    const element = await Header();

    expect(element.props.politiciansByYear).toEqual({ 2025: [], 2026: [] });
    expect(element.props.showResearchFundNavigation).toBe(false);
  });

  it("ある年度だけに公開する議員がいれば、ナビに調査研究費を出す", async () => {
    loadResearchFundPoliticiansMock.mockImplementation(async ({ financialYear }) =>
      financialYear === 2026 ? [POLITICIAN] : [],
    );

    const element = await Header();

    expect(element.props.politiciansByYear).toEqual({ 2025: [], 2026: [POLITICIAN] });
    expect(element.props.showResearchFundNavigation).toBe(true);
  });
});
