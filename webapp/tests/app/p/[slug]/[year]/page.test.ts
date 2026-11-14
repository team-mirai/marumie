jest.mock("@/server/contexts/research-fund/presentation/loaders/load-research-fund-page", () => ({
  loadResearchFundPage: jest.fn(),
}));
// metadata だけを確かめるので、重い UI ライブラリを読み込む子コンポーネントは差し替える。
jest.mock("@/server/contexts/research-fund/presentation/loaders/load-research-fund-politician-cards", () => ({
  loadResearchFundPoliticianCards: jest.fn(),
}));
jest.mock("@/client/components/common/GradientMessageCard", () => ({ __esModule: true, default: () => null }));
jest.mock("@/client/components/layout/MainColumn", () => ({ __esModule: true, default: () => null }));
jest.mock("@/client/components/layout/Breadcrumbs", () => ({ __esModule: true, default: () => null }));
jest.mock("@/client/components/research-fund/OtherPoliticiansSection", () => ({ __esModule: true, default: () => null }));
jest.mock("@/client/components/research-fund/PoliticianHeadingCard", () => ({ __esModule: true, default: () => null }));
jest.mock("@/client/components/research-fund/ResearchFundBottomBlock", () => ({ __esModule: true, default: () => null }));
jest.mock("@/client/components/research-fund/ResearchFundExpensesSection", () => ({ __esModule: true, default: () => null }));
jest.mock("@/client/components/research-fund/ResearchFundFlowSection", () => ({ __esModule: true, default: () => null }));
jest.mock("@/client/components/research-fund/ResearchFundHighlightsSection", () => ({ __esModule: true, default: () => null }));
jest.mock("@/client/components/research-fund/ResearchFundMonthlySection", () => ({ __esModule: true, default: () => null }));
jest.mock("@/client/components/research-fund/ResearchFundCrossLink", () => ({
  ResearchFundCrossLinkProvider: () => null,
}));

import type { ReactElement, ReactNode } from "react";
import PoliticianPage, { generateMetadata } from "@/app/p/[slug]/[year]/page";
import { loadResearchFundPage } from "@/server/contexts/research-fund/presentation/loaders/load-research-fund-page";
import { loadResearchFundPoliticianCards } from "@/server/contexts/research-fund/presentation/loaders/load-research-fund-politician-cards";
import { deriveResearchFundPreviewToken } from "@/shared/research-fund/preview-token";

const loadResearchFundPageMock = loadResearchFundPage as jest.Mock;
const loadResearchFundPoliticianCardsMock = loadResearchFundPoliticianCards as jest.Mock;

const SECRET = "test-secret";
const TOKEN = deriveResearchFundPreviewToken(SECRET, "sample-taro");
const politician = {
  name: "サンプル太郎",
  slug: "sample-taro",
  nameKana: null,
  title: null,
  profileUrl: null,
  websiteUrl: null,
  snsUrls: [],
  hasPhoto: true,
};
const cardOf = (slug: string, name: string) => ({ slug, name, title: null, hasPhoto: false });
const paramsOf = (slug: string) => Promise.resolve({ slug, year: "2026" });

beforeEach(() => {
  process.env.RESEARCH_FUND_PREVIEW_SECRET = SECRET;
  loadResearchFundPageMock.mockReset();
  loadResearchFundPoliticianCardsMock.mockReset();
  loadResearchFundPoliticianCardsMock.mockResolvedValue([]);
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

  const pageData = (isPublic: boolean) => ({
    politician,
    isPublic,
    financialYear: 2026,
    years: [2025, 2026],
    asOfDate: null,
    grantPeriodLabel: "2026年2月〜8月支給分",
    policyComment: null,
    groups: [],
    dataNote: "仕訳が完了した支出を掲載しています。",
  });

  type Child = ReactElement<Record<string, unknown> & { children?: ReactElement<Record<string, unknown>>[] }>;

  async function render(slug: string) {
    const page = (await PoliticianPage({ params: paramsOf(slug) })) as ReactElement<{
      spacing: string;
      children: ReactNode[];
    }>;
    const children = page.props.children as (Child | false | null)[];
    const [heading, flow, , others, bottom] = children;
    const [breadcrumbs, card] = (heading as Child).props.children ?? [];
    return { page, breadcrumbs, card, flow: flow as Child, others, bottom: bottom as Child };
  }

  it.each([
    ["公開する議員", "sample-taro", true],
    ["プレビュー URL", `sample-taro~${TOKEN}`, false],
  ])("%sでも、パンくず・議員カードと v8 の本文（下部ブロックは議員ページ用）を同じ組み立てで出す", async (_, slug, isPublic) => {
    loadResearchFundPageMock.mockResolvedValue(pageData(isPublic));

    const { page, breadcrumbs, card, flow, bottom } = await render(slug);

    expect(page.props.spacing).toBe("compact");
    expect(breadcrumbs.props.current).toBe("サンプル太郎の調研費");
    expect(card.props.politician).toBe(politician);
    // 年の切り替え・写真は、プレビュー用の文字列を含む slug の区間のまま引き継ぐ
    expect(card.props.years).toEqual([
      { year: 2025, href: `/p/${encodeURIComponent(slug)}/2025` },
      { year: 2026, href: `/p/${encodeURIComponent(slug)}/2026` },
    ]);
    expect(card.props.photoUrl).toBe(
      `/api/research-fund/politicians/${encodeURIComponent(slug)}/photo`,
    );
    expect(flow.props.eyebrow).toBe("サンプル太郎の調研費・2026年");
    expect(bottom.props.dataNote).toBe("仕訳が完了した支出を掲載しています。");
  });

  it("公開中の議員を表示順にたどる前後の切り替えと、ほかの議員の一覧を出す", async () => {
    loadResearchFundPageMock.mockResolvedValue(pageData(true));
    loadResearchFundPoliticianCardsMock.mockResolvedValue([
      cardOf("sample-jiro", "サンプル次郎"),
      cardOf("sample-taro", "サンプル太郎"),
      cardOf("sample-saburo", "サンプル三郎"),
    ]);

    const { card, others } = await render("sample-taro");
    const nav = card.props.nav as { prev: { href: string }; next: { href: string } };

    expect(loadResearchFundPoliticianCardsMock).toHaveBeenCalledWith({ financialYear: 2026 });
    expect(nav.prev.href).toBe("/p/sample-jiro/2026");
    expect(nav.next.href).toBe("/p/sample-saburo/2026");
    expect(
      ((others as Child).props.politicians as { slug: string }[]).map((p) => p.slug),
    ).toEqual(["sample-jiro", "sample-saburo"]);
  });

  it("公開中の議員が 1 人だけなら、前後の切り替えとほかの議員を出さない", async () => {
    loadResearchFundPageMock.mockResolvedValue(pageData(true));
    loadResearchFundPoliticianCardsMock.mockResolvedValue([cardOf("sample-taro", "サンプル太郎")]);

    const { card, others } = await render("sample-taro");

    expect(card.props.nav).toBeNull();
    expect(others).toBeFalsy();
  });

  it("議員の一覧が取れなくても、本文は出して切り替えだけを出さない", async () => {
    jest.spyOn(console, "error").mockImplementation(() => {});
    loadResearchFundPageMock.mockResolvedValue(pageData(true));
    loadResearchFundPoliticianCardsMock.mockRejectedValue(new Error("db down"));

    const { card, others } = await render("sample-taro");

    expect(card.props.nav).toBeNull();
    expect(others).toBeFalsy();
  });
});
