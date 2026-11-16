import { renderToStaticMarkup } from "react-dom/server";
import HeaderSpMenu from "@/client/components/layout/header/HeaderSpMenu";
import type { HeaderPoliticianMenuItem } from "@/client/lib/header-navigation";

function politician(slug: string, name: string, years: number[]): HeaderPoliticianMenuItem {
  return {
    slug,
    name,
    photoUrl: null,
    isCurrent: false,
    href: `/p/${slug}/${years[years.length - 1]}`,
    years: years.map((year) => ({ year, href: `/p/${slug}/${year}`, isSelected: false })),
  };
}

function render(politicians: HeaderPoliticianMenuItem[]): string {
  return renderToStaticMarkup(
    <HeaderSpMenu
      id="menu"
      navItems={[]}
      step="rf"
      onStepChange={() => {}}
      organizations={[]}
      politicians={politicians}
      onNavigate={() => {}}
    />,
  );
}

describe("HeaderSpMenu（調研費）", () => {
  it("公開している年が1つだけの議員の行には年を出さない", () => {
    const html = render([politician("sample-taro", "サンプル太郎", [2026])]);

    expect(html).toContain('href="/p/sample-taro/2026"');
    expect(html).not.toContain("2026年");
  });

  it("公開している年が2つ以上の議員は、年ごとの行に年を出す", () => {
    const html = render([politician("sample-hanako", "サンプル花子", [2025, 2026])]);

    expect(html).toContain("2025年");
    expect(html).toContain("2026年");
  });
});
