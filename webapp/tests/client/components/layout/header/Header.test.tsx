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

  it("調研費を公開する議員を年度ごとにメニューへ渡す", async () => {
    loadResearchFundPoliticiansMock.mockImplementation(async ({ financialYear }) =>
      financialYear === 2026 ? [POLITICIAN] : [],
    );

    const element = await Header();

    expect(element.props.politiciansByYear).toEqual({ 2025: [], 2026: [POLITICIAN] });
  });

  it("議員の一覧が取れなくても、その年度を空にしてヘッダーを描く", async () => {
    const consoleError = jest.spyOn(console, "error").mockImplementation(() => {});
    loadResearchFundPoliticiansMock.mockImplementation(async ({ financialYear }) => {
      if (financialYear === 2025) throw new Error("no ledger");
      return [POLITICIAN];
    });

    const element = await Header();

    expect(element.props.politiciansByYear).toEqual({ 2025: [], 2026: [POLITICIAN] });
    consoleError.mockRestore();
  });
});
