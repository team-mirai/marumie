import { renderToStaticMarkup } from "react-dom/server";
import HomeResearchFundSection from "@/client/components/home/HomeResearchFundSection";
import type {
  ResearchFundHomePoliticianView,
  ResearchFundHomeSummaryData,
} from "@/server/contexts/research-fund/domain/models/research-fund-home-summary";

// サンキー図の中身はこのテストの対象外なので描かない（図は sankey-layout のテストで確かめる）
jest.mock("@/client/components/top-page/features/charts/SankeyChart", () => ({
  __esModule: true,
  default: () => null,
}));

const EMPTY_SANKEY = { nodes: [], links: [] };

function politician(
  overrides: Partial<ResearchFundHomePoliticianView> = {},
): ResearchFundHomePoliticianView {
  return {
    slug: "sample-taro",
    name: "サンプル太郎",
    nameKana: "さんぷるたろう",
    house: "shugiin",
    hasPhoto: true,
    asOfDate: "2026-08-20",
    grantPeriodLabel: "2026年2月〜8月支給分",
    kpi: { granted: 7_000_000, spent: 3_260_000 },
    sankey: { detailed: EMPTY_SANKEY, legal: EMPTY_SANKEY },
    ...overrides,
  };
}

function render(politicians: ResearchFundHomePoliticianView[]): string {
  const data: ResearchFundHomeSummaryData = {
    financialYear: 2026,
    politicians,
  };
  return renderToStaticMarkup(<HomeResearchFundSection data={data} />);
}

describe("HomeResearchFundSection", () => {
  it("見出し・説明・調研費とは・使用方針のリンク（別タブ）を出す", () => {
    const html = render([politician()]);

    expect(html).toContain("所属議員の調研費");
    expect(html).toContain("議員に毎月100万円支給される公費を何に使ったか");
    expect(html).toContain("調研費（調査研究広報滞在費）とは");
    expect(html).toMatch(
      /<a href="https:\/\/note\.com\/team_mirai_jp" target="_blank" rel="noopener noreferrer"[^>]*>/,
    );
    expect(html).toContain("チームみらいの調研費の使用方針");
  });

  it("議員カードに名前・ふりがな・院・番号を表示順に出し、金額は出さない", () => {
    const html = render([
      politician(),
      politician({ slug: "sample-hanako", name: "サンプル花子", nameKana: null, house: "sangiin" }),
    ]);

    expect(html).toContain("さんぷるたろう");
    expect(html).toContain("衆議院");
    expect(html).toContain("No.01");
    expect(html).toContain("参議院");
    expect(html).toContain("No.02");
    expect(html.indexOf("サンプル太郎")).toBeLessThan(html.indexOf("サンプル花子"));
    expect(html).toContain('aria-label="サンプル花子の調研費を下に表示"');
  });

  it("顔写真があれば写真の API を、無ければ人型のアイコンを出す", () => {
    const html = render([
      politician(),
      politician({ slug: "sample-hanako", name: "サンプル花子", hasPhoto: false }),
    ]);

    expect(html).toContain("/api/research-fund/politicians/sample-taro/photo");
    expect(html).not.toContain("/api/research-fund/politicians/sample-hanako/photo");
    expect(html).toContain('role="img" aria-label="サンプル花子の写真"');
  });

  it("最初は先頭の議員の調研費（年度・更新日・支給総額・支出総額・詳しく）を出す", () => {
    const html = render([
      politician(),
      politician({ slug: "sample-hanako", name: "サンプル花子" }),
    ]);

    expect(html).toContain("サンプル太郎の調研費</h3>");
    expect(html).toContain("2026年2月〜8月支給分");
    expect(html).toContain("2026.8.20更新");
    expect(html).toContain("2026年");
    expect(html).toContain("支給総額");
    expect(html).toContain("支出総額");
    expect(html).toContain('href="/p/sample-taro/2026"');
    expect(html).toContain("サンプル太郎の調研費を詳しく");
    expect(html).not.toContain("サンプル花子の調研費を詳しく");
  });
});
