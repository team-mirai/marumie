import { renderToStaticMarkup } from "react-dom/server";
import Breadcrumbs from "@/client/components/layout/Breadcrumbs";

describe("Breadcrumbs", () => {
  it("ページ冒頭のパンくずは「パンくずリスト」で、ナビの下 20px に寄せるため上へずらす", () => {
    const html = renderToStaticMarkup(<Breadcrumbs current="チームみらいの収支" />);
    expect(html).toContain('aria-label="パンくずリスト"');
    expect(html).toContain('class="-mt-3 min-[641px]:-mt-4 xl:-mt-5"');
    expect(html).toContain('aria-current="page"');
  });

  it("フッターの上のパンくずは「パンくずリスト（ページ下部）」にする", () => {
    const html = renderToStaticMarkup(
      <Breadcrumbs
        parent={{ label: "チームみらいの収支", href: "/o/team-mirai/2026" }}
        current="すべての出入金"
        position="bottom"
      />,
    );
    expect(html).toContain('aria-label="パンくずリスト（ページ下部）"');
    expect(html).toContain('href="/o/team-mirai/2026"');
  });

  it("リンクは見た目を変えずに上下 13px ずつ押せる範囲を広げる（44px 以上）", () => {
    const html = renderToStaticMarkup(
      <Breadcrumbs parent={{ label: "親", href: "/parent" }} current="今" />,
    );
    const links = html.match(/<a [^>]*>/g) ?? [];
    expect(links).toHaveLength(2);
    for (const link of links) {
      expect(link).toMatch(/class="[^"]*-my-\[13px\] [^"]*py-\[13px\]/);
    }
  });
});
