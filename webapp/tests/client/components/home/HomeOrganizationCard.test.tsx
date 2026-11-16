import { renderToStaticMarkup } from "react-dom/server";
import HomeOrganizationCard from "@/client/components/home/HomeOrganizationCard";

// サンキー図の中身はこのテストの対象外なので描かない
jest.mock("@/client/components/top-page/features/charts/SankeyChart", () => ({
  __esModule: true,
  default: () => null,
}));

const EMPTY_SANKEY = { nodes: [], links: [] };

function render(props: { subtitle?: string; updatedAt?: string } = {}): string {
  return renderToStaticMarkup(
    <HomeOrganizationCard
      tone="group"
      slug="sample-group"
      name="サンプル団体"
      subtitle={props.subtitle}
      avatar={<span />}
      updatedAt={props.updatedAt ?? "2026.10.23 更新"}
      years={[
        { year: 2025, political: EMPTY_SANKEY, friendly: EMPTY_SANKEY },
        { year: 2026, political: EMPTY_SANKEY, friendly: EMPTY_SANKEY },
      ]}
      defaultYear={2026}
    />,
  );
}

describe("HomeOrganizationCard", () => {
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
});
