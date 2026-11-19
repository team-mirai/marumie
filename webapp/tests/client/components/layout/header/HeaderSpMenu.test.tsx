import { renderToStaticMarkup } from "react-dom/server";
import HeaderSpMenu from "@/client/components/layout/header/HeaderSpMenu";
import type {
  HeaderOrganizationMenuItem,
  HeaderPoliticianMenuItem,
} from "@/client/lib/header-navigation";

function organization(
  slug: string,
  name: string,
  icon: Pick<HeaderOrganizationMenuItem, "kind" | "hasPhoto"> = { kind: "party", hasPhoto: false },
): HeaderOrganizationMenuItem {
  return {
    slug,
    name,
    officialName: null,
    ...icon,
    isCurrent: false,
    href: `/o/${slug}/2026`,
    years: [2025, 2026].map((year) => ({ year, href: `/o/${slug}/${year}`, isSelected: false })),
  };
}

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

function render(
  organizations: HeaderOrganizationMenuItem[],
  politicians: HeaderPoliticianMenuItem[],
): string {
  return renderToStaticMarkup(
    <HeaderSpMenu
      id="menu"
      organizations={organizations}
      politicians={politicians}
      onNavigate={() => {}}
    />,
  );
}

describe("HeaderSpMenu", () => {
  it("政党・政治団体 → 議員の調研費 → このサイトについて → 調研費についてのご意見 の順に1枚に並べる", () => {
    const html = render(
      [organization("team-mirai", "チームみらい")],
      [politician("sample-taro", "サンプル太郎", [2026])],
    );

    const order = [
      "政党・政治団体",
      "チームみらいの収支",
      "議員の調研費",
      "サンプル太郎",
      "このサイトについて",
      "まる見え政治資金とは",
      "データについて",
      "よくあるご質問",
      "ソースコード（GitHub）",
      "調研費についてのご意見",
    ].map((text) => html.indexOf(text));
    expect(order.every((index) => index >= 0)).toBe(true);
    expect([...order].sort((a, b) => a - b)).toEqual(order);
  });

  it("団体と議員は1行・1つの顔写真で、それぞれのページ（年は選ばない）へ移る", () => {
    const html = render(
      [organization("team-mirai", "チームみらい")],
      [politician("sample-hanako", "サンプル花子", [2025, 2026])],
    );

    expect(html).toContain('href="/o/team-mirai/2026"');
    expect(html).not.toContain('href="/o/team-mirai/2025"');
    expect(html).toContain('href="/p/sample-hanako/2026"');
    expect(html).not.toContain('href="/p/sample-hanako/2025"');
    expect(html).not.toContain("2025年");
  });

  it("政党の行も政治団体の行も、admin で登録した代表者の顔写真を出す", () => {
    const html = render(
      [
        organization("team-mirai", "チームみらい", { kind: "party", hasPhoto: true }),
        organization("sample-group", "サンプル会", { kind: "group", hasPhoto: true }),
      ],
      [],
    );

    const partyRow = html.slice(html.indexOf('href="/o/team-mirai/2026"'), html.indexOf("チームみらいの収支"));
    const groupRow = html.slice(html.indexOf('href="/o/sample-group/2026"'), html.indexOf("サンプル会の収支"));
    expect(partyRow).toContain('src="/api/organizations/team-mirai/photo"');
    expect(partyRow).not.toContain("team-mirai-logo.svg");
    expect(groupRow).toContain('src="/api/organizations/sample-group/photo"');
  });

  it("顔写真が未登録の政党は、政治団体と同じく人型のアイコンにする", () => {
    const html = render(
      [organization("team-mirai", "チームみらい", { kind: "party", hasPhoto: false })],
      [],
    );

    const partyRow = html.slice(html.indexOf('href="/o/team-mirai/2026"'), html.indexOf("チームみらいの収支"));
    expect(partyRow).toContain("<svg");
    expect(partyRow).not.toContain("<img");
    expect(partyRow).not.toContain("team-mirai-logo.svg");
  });

  it("顔写真が未登録の政治団体は、トップのカードと同じく人型のアイコンにする", () => {
    const html = render(
      [organization("sample-group", "サンプル会", { kind: "group", hasPhoto: false })],
      [],
    );

    const groupRow = html.slice(html.indexOf('href="/o/sample-group/2026"'), html.indexOf("サンプル会の収支"));
    expect(groupRow).toContain("<svg");
    expect(groupRow).not.toContain("<img");
    expect(groupRow).not.toContain("team-mirai-logo.svg");
  });

  it("v8 の2段階メニューの「戻る」と仮のメニューの注記、寄附・党員のボタンを出さない", () => {
    const html = render([organization("team-mirai", "チームみらい")], []);

    expect(html).not.toContain("戻る");
    expect(html).not.toContain("仮");
    expect(html).not.toContain("寄附で応援する");
    expect(html).not.toContain("党員になる");
  });

  it("調研費を公開している議員がいなければ「議員の調研費」を出さない", () => {
    const html = render([organization("team-mirai", "チームみらい")], []);

    expect(html).not.toContain("議員の調研費");
  });

  it("別タブで開くリンクは読み上げ名に「（別タブで開きます）」が付く", () => {
    const html = render([], []);

    expect(html).toContain('aria-label="よくあるご質問（別タブで開きます）"');
    expect(html).toContain('aria-label="ソースコード（GitHub）（別タブで開きます）"');
    expect(html).toContain('aria-label="調研費についてのご意見（別タブで開きます）"');
  });
});
