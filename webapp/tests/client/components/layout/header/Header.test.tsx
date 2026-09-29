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
  const originalValue = process.env.HIDE_RESEARCH_FUND_ENTRY;

  beforeEach(() => {
    loadOrganizationsMock.mockResolvedValue({ default: "team-mirai", organizations: [] });
    loadResearchFundPoliticiansMock.mockReset();
    loadResearchFundPoliticiansMock.mockResolvedValue([POLITICIAN]);
  });

  afterEach(() => {
    if (originalValue === undefined) {
      delete process.env.HIDE_RESEARCH_FUND_ENTRY;
    } else {
      process.env.HIDE_RESEARCH_FUND_ENTRY = originalValue;
    }
  });

  it("未設定なら公開済みの議員をセレクターに渡し、ナビに調査研究費を出す", async () => {
    delete process.env.HIDE_RESEARCH_FUND_ENTRY;

    const element = await Header();

    expect(element.props.politiciansByYear).toEqual({ 2025: [POLITICIAN], 2026: [POLITICIAN] });
    expect(element.props.showResearchFundNavigation).toBe(true);
  });

  it("隠す設定なら公開済みの議員がいてもセレクターに出さず、ナビの調査研究費も出さない", async () => {
    process.env.HIDE_RESEARCH_FUND_ENTRY = "true";

    const element = await Header();

    expect(element.props.politiciansByYear).toEqual({ 2025: [], 2026: [] });
    expect(element.props.showResearchFundNavigation).toBe(false);
    expect(loadResearchFundPoliticiansMock).not.toHaveBeenCalled();
  });
});
