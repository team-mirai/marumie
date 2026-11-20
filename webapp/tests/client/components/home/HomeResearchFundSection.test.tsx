import { renderToStaticMarkup } from "react-dom/server";
import HomeResearchFundSection from "@/client/components/home/HomeResearchFundSection";
import type {
  ResearchFundHomePoliticianView,
  ResearchFundHomeSummaryData,
  ResearchFundHomeYearView,
} from "@/server/contexts/research-fund/domain/models/research-fund-home-summary";

// サンキー図の中身はこのテストの対象外なので描かない（図は sankey-layout のテストで確かめる）
jest.mock("@/client/components/top-page/features/charts/SankeyChart", () => ({
  __esModule: true,
  default: () => null,
}));

const EMPTY_SANKEY = { nodes: [], links: [] };

function year(overrides: Partial<ResearchFundHomeYearView> = {}): ResearchFundHomeYearView {
  return {
    financialYear: 2026,
    asOfDate: "2026-08-20",
    grantPeriodLabel: "2026年2-8月分",
    kpi: { granted: 7_000_000, spent: 3_260_000 },
    sankey: { detailed: EMPTY_SANKEY, legal: EMPTY_SANKEY },
    ...overrides,
  };
}

const YEAR_2025 = year({
  financialYear: 2025,
  asOfDate: "2026-01-31",
  grantPeriodLabel: "2025年8-12月分",
  kpi: { granted: 5_000_000, spent: 1_230_000 },
});

function politician(
  overrides: Partial<ResearchFundHomePoliticianView> = {},
): ResearchFundHomePoliticianView {
  return {
    slug: "sample-taro",
    name: "サンプル太郎",
    nameKana: "さんぷるたろう",
    house: "shugiin",
    hasPhoto: true,
    years: [year()],
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
  it("公開中の一覧にもいる議員は、準備中としては並べない（キャッシュの切り替わりの間の重なり）", () => {
    const data: ResearchFundHomeSummaryData = { financialYear: 2026, politicians: [politician()] };
    const html = renderToStaticMarkup(
      <HomeResearchFundSection
        data={data}
        comingSoon={[
          { slug: "sample-taro", name: "サンプル太郎", nameKana: null, hasPhoto: true, note: null },
        ]}
      />,
    );

    expect(html).not.toContain("サンプル太郎の調研費（準備中）");
  });

  it("「準備中」の議員を公開中の議員の後ろに「準備中」のタグを添えて並べる", () => {
    const data: ResearchFundHomeSummaryData = { financialYear: 2026, politicians: [politician()] };
    const html = renderToStaticMarkup(
      <HomeResearchFundSection
        data={data}
        comingSoon={[
          {
            slug: "sample-usami",
            name: "サンプル準備",
            nameKana: "さんぷるじゅんび",
            hasPhoto: false,
            note: "業務逼迫のため、12月中旬を目処に公開予定です。",
          },
        ]}
      />,
    );

    expect(html).toContain("サンプル準備の調研費（準備中）を下に表示");
    expect(html).toContain("準備中");
    expect(html.indexOf("サンプル太郎")).toBeLessThan(html.indexOf("サンプル準備"));
    expect(html).toContain('data-wallet-card="sample-usami"');
  });

  it("見出し・説明・調研費とは・使用方針のリンク（別タブ）を出す", () => {
    const html = render([politician()]);

    expect(html).toContain("所属議員の調研費");
    expect(html).toContain("議員に毎月100万円支給される公費を何に使ったか");
    expect(html).toContain("調研費（調査研究広報滞在費）とは");
    expect(html).toContain("国民との交流、滞在などの活動のために");
    expect(html).toContain("選挙運動には使えません。年内に使わなかった未使用分は国庫に返還します。");
    expect(html).toMatch(
      /<a href="https:\/\/note\.com\/team_mirai_jp\/n\/n9ec9166d0e1e" target="_blank" rel="noopener noreferrer"[^>]*>/,
    );
    expect(html).toContain("チームみらいの調研費の使用方針");
  });

  it("見出しを h2 にし、セクションの名前にする", () => {
    const html = render([politician()]);

    expect(html).toMatch(/<section id="home-rf" aria-labelledby="home-rf-heading"/);
    expect(html).toMatch(
      /<h2 id="home-rf-heading"[^>]*><span class="reveal-line"><span>所属議員の調研費<\/span><\/span><\/h2>/,
    );
  });

  it("議員を表示順に並べ、ふりがな・院・番号・金額はカードに出さない", () => {
    const html = render([
      politician(),
      politician({ slug: "sample-hanako", name: "サンプル花子", house: "sangiin" }),
    ]);

    expect(html.indexOf("サンプル太郎")).toBeLessThan(html.indexOf("サンプル花子"));
    expect(html).toContain('aria-label="サンプル花子の調研費を下に表示"');
    expect(html).toContain('aria-label="サンプル花子の調研費"');
    expect(html).not.toContain("さんぷるたろう");
    expect(html).not.toContain("参議院");
    expect(html).not.toContain("No.01");
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

  it("最初は先頭の議員の調研費（期間・更新日・支給総額・支出総額・詳しく）を出す", () => {
    const html = render([
      politician(),
      politician({ slug: "sample-hanako", name: "サンプル花子" }),
    ]);

    // PC の見出しは、タイトル・›・期間が 1 つのリンク
    expect(html).toMatch(
      /<a [^>]*href="\/p\/sample-taro\/2026"><h3[^>]*>サンプル太郎の調研<span class="whitespace-nowrap">費<span aria-hidden="true".*?<\/h3><span [^>]*>2026年2-8月分<\/span><\/a>/,
    );
    expect(html).toContain("2026.8.20 更新");
    expect(html).toContain("支給総額");
    expect(html).toContain("支出総額");
    expect(html).toContain("サンプル太郎の調研費を詳しく");
    expect(html).not.toContain("サンプル花子の調研費を詳しく");
  });

  it("SP の開いたカードに、名前の下の期間・押せない年のラベル・「詳しく見る」を出し、年の切り替えは出さない", () => {
    const html = render([politician()]);

    expect(html).toContain("調研費・2026年2-8月分");
    expect(html).toMatch(/>2026(<!-- -->)?年<\/span>/);
    expect(html).toMatch(
      /<a [^>]*aria-label="サンプル太郎の調研費を詳しく見る"[^>]*>詳しく見る<\/a>/,
    );
    expect(html).not.toContain('aria-label="表示する年"');
  });

  it("SP の開いたカードの「詳しく見る」は政党・政治団体と同じ動きの more-link にし、開いたシートは上から滑り込ませる", () => {
    const html = render([politician()]);

    expect(html).toMatch(
      /<a [^>]*class="more-link"[^>]*aria-label="サンプル太郎の調研費を詳しく見る"|<a [^>]*aria-label="サンプル太郎の調研費を詳しく見る"[^>]*class="more-link"/,
    );
    expect(html).toMatch(/data-wallet-sheet="sample-taro"[^>]*class="wallet-sheet-in /);
  });

  it("黒いピルボタンはホバーで矢印を動かす pill-arrow を付ける", () => {
    const html = render([politician()]);

    expect(html).toMatch(/<a [^>]*class="pill-arrow [^"]*"[^>]*>サンプル太郎の調研費を詳しく/);
  });

  it("期間が無い議員は名前の下を「調研費・準備中」にし、かなは出さない", () => {
    const html = render([politician({ years: [year({ grantPeriodLabel: null })] })]);

    expect(html).toContain("調研費・準備中");
    expect(html).not.toContain("さんぷるたろう");
  });

  it("図の下に未使用分の返還の注記を PC・SP の両方に出す", () => {
    const html = render([politician()]);

    expect(html.split("※年内に使わなかった未使用分は国庫に返還します。")).toHaveLength(3);
  });

  it("SP は先頭の議員のカードだけを開いた状態で始め、カードに開いているかの印を付ける", () => {
    const html = render([
      politician(),
      politician({ slug: "sample-hanako", name: "サンプル花子" }),
    ]);

    expect(html).toContain('data-wallet-card="sample-taro" data-on="true"');
    expect(html).toContain('data-wallet-card="sample-hanako" data-on="false"');
    expect(html).toContain('data-wallet-sheet="sample-taro"');
    expect(html).not.toContain('data-wallet-sheet="sample-hanako"');
  });

  describe("年の切り替え", () => {
    it("2年分を公開している議員には、PC の見出しの行と SP の開いたカードに年の切り替えを出し、最初は defaultYear を選ぶ", () => {
      const html = render([politician({ years: [YEAR_2025, year()] })]);

      const segments = html.match(/<fieldset aria-label="表示する年"[\s\S]*?<\/fieldset>/g) ?? [];
      // PC の見出しの行と SP の開いたカード
      expect(segments).toHaveLength(2);
      for (const segment of segments) {
        expect(segment).toMatch(/<button type="button" aria-pressed="false"[^>]*>2025<\/button>/);
        expect(segment).toMatch(/<button type="button" aria-pressed="true"[^>]*>2026<\/button>/);
      }
      // SP の押せない年のラベルは出さない
      expect(html).not.toMatch(/>2026(<!-- -->)?年<\/span>/);
      // 中身・リンク先は 2026 年分
      expect(html).toContain("2026年2-8月分");
      expect(html).not.toContain("2025年8-12月分");
      expect(html).toContain("2026.8.20 更新");
      expect(html).toContain('href="/p/sample-taro/2026"');
      expect(html).not.toContain('href="/p/sample-taro/2025"');
    });

    it("1年分だけの議員には年の切り替えを出さない", () => {
      const html = render([
        politician({ years: [YEAR_2025, year()] }),
        politician({ slug: "sample-hanako", name: "サンプル花子" }),
      ]);

      // 2年分ある先頭の議員の分（PC・SP）だけ
      expect(html.match(/aria-label="表示する年"/g)).toHaveLength(2);
    });

    it("最初に出す年が無い議員は、最新の年の調研費を出す", () => {
      const html = render([politician({ years: [YEAR_2025] })]);

      expect(html).toContain("2025年8-12月分");
      expect(html).toContain('href="/p/sample-taro/2025"');
      expect(html).not.toContain('aria-label="表示する年"');
    });
  });
});
