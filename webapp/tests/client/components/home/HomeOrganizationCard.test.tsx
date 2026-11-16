import { renderToStaticMarkup } from "react-dom/server";
import HomeOrganizationCard from "@/client/components/home/HomeOrganizationCard";

// サンキー図の中身はこのテストの対象外なので描かない
jest.mock("@/client/components/top-page/features/charts/SankeyChart", () => ({
  __esModule: true,
  default: () => null,
}));

const EMPTY_SANKEY = { nodes: [], links: [] };
const SANKEY = {
  nodes: [{ id: "income" }, { id: "total" }],
  links: [{ source: "income", target: "total", value: 100 }],
};

type Year = { year: number; political: typeof SANKEY | null; friendly: typeof SANKEY | null };

function render(
  props: {
    subtitle?: string;
    updatedAt?: string;
    headingLevel?: "h2" | "h3";
    years?: Year[];
    tone?: "party" | "group";
  } = {},
): string {
  return renderToStaticMarkup(
    <HomeOrganizationCard
      tone={props.tone ?? "group"}
      slug="sample-group"
      name="サンプル団体"
      subtitle={props.subtitle}
      avatar={<span />}
      updatedAt={props.updatedAt ?? "2026.10.23 更新"}
      years={
        props.years ?? [
          { year: 2025, political: SANKEY, friendly: SANKEY },
          { year: 2026, political: SANKEY, friendly: SANKEY },
        ]
      }
      defaultYear={2026}
      headingLevel={props.headingLevel}
    />,
  );
}

describe("HomeOrganizationCard", () => {
  it("見出しは既定で h2、指定すれば h3 にする", () => {
    expect(render()).toMatch(/<h2[^>]*>.*サンプル団体/);
    expect(render()).not.toContain("<h3");

    const html = render({ headingLevel: "h3" });
    expect(html).toMatch(/<h3[^>]*>.*サンプル団体/);
    expect(html).not.toContain("<h2");
  });

  it("見出しの下に正式名と表示中の年を出す", () => {
    const html = render({ subtitle: "サンプルの会" });

    expect(html).toContain("サンプルの会・");
    expect(html).toContain("2026年");
  });

  it("正式名が無いときは表示中の年だけを出す", () => {
    const html = render();

    expect(html).toMatch(/text-\[#238778\]"><span class="whitespace-nowrap">2026年<\/span>/);
  });

  it("最終更新日をカードの末尾に出す", () => {
    const html = render();

    expect(html).toContain("2026.10.23 更新");
    expect(html.indexOf("2026.10.23 更新")).toBeLessThan(html.indexOf("サンプル団体の収支を詳しく"));
  });

  it("更新日が無いときは更新日の行を出さない", () => {
    const html = render({ updatedAt: "" });

    expect(html).not.toContain("更新");
  });

  it("「詳しく」の飛び先は表示中の年の政治団体ページ", () => {
    const html = render();

    expect(html).toContain('href="/o/sample-group/2026"');
    expect(html).not.toContain('href="/o/sample-group/2025"');
  });

  it("表示中の年の収支の流れが無いときは、図の代わりに準備中と出す", () => {
    const html = render({
      years: [{ year: 2026, political: EMPTY_SANKEY, friendly: EMPTY_SANKEY }],
    });

    expect(html).toContain("2026年の収支の流れの図は準備中です");
    expect(html).not.toContain('role="tablist"');
  });

  it("収支の流れがあるときは図の区分の切り替えを出す", () => {
    const html = render();

    expect(html).not.toContain("準備中");
    expect(html).toContain('role="tablist"');
  });

  it("取得に失敗したとき（null）は準備中とは出さない", () => {
    const html = render({ years: [{ year: 2026, political: null, friendly: null }] });

    expect(html).not.toContain("準備中");
  });

  it("「指を広げて拡大」は政党のカードの図にだけ出し、拡大ボタンはどちらにも出す", () => {
    const party = render({ tone: "party" });
    const group = render();

    expect(party).toContain("指を広げて拡大");
    expect(group).not.toContain("指を広げて拡大");
    expect(party).toContain('aria-label="図を拡大する"');
    expect(group).toContain('aria-label="図を拡大する"');
  });
});
