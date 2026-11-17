import { renderToStaticMarkup } from "react-dom/server";
import HeaderMegaMenu from "@/client/components/layout/header/HeaderMegaMenu";
import type {
  HeaderOrganizationMenuItem,
  HeaderPoliticianMenuItem,
} from "@/client/lib/header-navigation";

function politician(years: number[], overrides: Partial<HeaderPoliticianMenuItem> = {}): HeaderPoliticianMenuItem {
  return {
    slug: "sample-taro",
    name: "サンプル太郎",
    photoUrl: null,
    isCurrent: false,
    href: `/p/sample-taro/${years[years.length - 1]}`,
    years: years.map((year) => ({ year, href: `/p/sample-taro/${year}`, isSelected: false })),
    ...overrides,
  };
}

function render(politicians: HeaderPoliticianMenuItem[]): string {
  return renderToStaticMarkup(
    <HeaderMegaMenu id="menu" menu="rf" organizations={[]} politicians={politicians} onNavigate={() => {}} />,
  );
}

describe("HeaderMegaMenu（調研費）", () => {
  it("見出しはトップページの調研費へのリンクで、後ろに右向きのシェブロンが付く", () => {
    const html = render([politician([2026])]);

    expect(html).toMatch(
      /<a [^>]*href="\/#home-rf"[^>]*>所属議員の調研費｜毎月支給される公費を何に使ったか<svg[^>]*aria-hidden="true"[^>]*><path d="M9 5l7 7-7 7"/,
    );
  });

  it("公開している年が1つだけの議員には年の切り替えを出さない", () => {
    const html = render([politician([2026])]);

    expect(html).not.toContain("サンプル太郎の調研費の表示する年");
  });

  it("公開している年が2つ以上の議員には年の切り替えを出す", () => {
    const html = render([politician([2025, 2026])]);

    expect(html).toContain('aria-label="サンプル太郎の調研費の表示する年"');
    expect(html).toContain('href="/p/sample-taro/2025"');
  });
});

function organization(
  years: number[],
  selectedYear: number | null = null,
): HeaderOrganizationMenuItem {
  return {
    slug: "sample-party",
    name: "サンプル党",
    officialName: null,
    kind: "party",
    hasPhoto: false,
    isCurrent: selectedYear !== null,
    href: "/o/sample-party/2026",
    years: years.map((year) => ({
      year,
      href: `/o/sample-party/${year}`,
      isSelected: year === selectedYear,
    })),
  };
}

function renderOrganizations(organizations: HeaderOrganizationMenuItem[]): string {
  return renderToStaticMarkup(
    <HeaderMegaMenu id="menu" menu="pf" organizations={organizations} politicians={[]} onNavigate={() => {}} />,
  );
}

describe("HeaderMegaMenu（政党・政治団体）", () => {
  it("説明文「政治資金｜政党・政治団体が集めて使うお金」を出さない", () => {
    const html = renderOrganizations([organization([2025, 2026])]);

    expect(html).not.toContain("政治資金｜政党・政治団体が集めて使うお金");
  });

  it("年を「2025年」「2026年」の個別のピルで並べ、表示中の年だけ黒にする", () => {
    const html = renderOrganizations([organization([2025, 2026], 2026)]);

    const pill2025 = html.match(/<a [^>]*>2025年<\/a>/)?.[0] ?? "";
    const pill2026 = html.match(/<a [^>]*>2026年<\/a>/)?.[0] ?? "";
    expect(pill2025).toContain('href="/o/sample-party/2025"');
    expect(pill2025).toContain("bg-white");
    expect(pill2025).not.toContain("aria-current");
    expect(pill2026).toContain('href="/o/sample-party/2026"');
    expect(pill2026).toContain('aria-current="page"');
    expect(pill2026).toContain("bg-black");
  });

  it("年が1つしかない団体にはピルを出さない", () => {
    const html = renderOrganizations([organization([2026])]);

    expect(html).not.toContain("サンプル党の表示する年");
  });
});

describe("HeaderMegaMenu（開くときの動き）", () => {
  it("パネルに幕が下りる動きのクラスを付ける", () => {
    const html = renderOrganizations([organization([2026])]);

    expect(html).toMatch(/<div id="menu" class="mega-menu /);
  });

  it("政党・政治団体は1行ずつ順番に入る", () => {
    const html = renderOrganizations([
      { ...organization([2026]), slug: "a" },
      { ...organization([2026]), slug: "b" },
    ]);

    const orders = [...html.matchAll(/<li style="--mega-menu-item-order:(\d+)" class="mega-menu-item /g)].map(
      (match) => match[1],
    );
    expect(orders).toEqual(["0", "1"]);
  });

  it("調研費は見出しのあと、議員を3人ずつの行ごとに同じ時差で入れる", () => {
    const html = render(
      ["a", "b", "c", "d"].map((slug) => politician([2026], { slug })),
    );

    expect(html).toMatch(/<a style="--mega-menu-item-order:0" class="mega-menu-item [^"]*" href="\/#home-rf"/);
    const orders = [...html.matchAll(/<li style="--mega-menu-item-order:(\d+)" class="mega-menu-item /g)].map(
      (match) => match[1],
    );
    expect(orders).toEqual(["1", "1", "1", "2"]);
  });
});
