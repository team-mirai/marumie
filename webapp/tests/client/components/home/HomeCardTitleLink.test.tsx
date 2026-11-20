import { renderToStaticMarkup } from "react-dom/server";
import HomeCardTitleLink from "@/client/components/home/HomeCardTitleLink";

function render(title: string, sub?: string): string {
  return renderToStaticMarkup(
    <HomeCardTitleLink
      href="/o/sample/2026"
      title={title}
      headingLevel="h2"
      sub={sub && <span>{sub}</span>}
    />,
  );
}

describe("HomeCardTitleLink", () => {
  it("タイトル・›・その下の年を 1 つのリンクにする", () => {
    const html = render("チームみらいの収支", "2026年");

    expect(html).toMatch(
      /^<a [^>]*href="\/o\/sample\/2026"><h2[^>]*>.*<\/h2><span>2026年<\/span><\/a>$/,
    );
    expect(html.match(/<a /g)).toHaveLength(1);
  });

  it("› はタイトルの最後の文字と改行させずにつなぎ、読み上げない", () => {
    const html = render("チームみらいの収支");

    expect(html).toContain(
      'チームみらいの収<span class="whitespace-nowrap">支<span aria-hidden="true"',
    );
  });

  it("ホバーでタイトルに下線、› は右へ動いて濃い緑。「動きを減らす」設定では動かさない", () => {
    const html = render("チームみらいの収支", "2026年");

    expect(html).toMatch(/<h2 class="[^"]*group-hover\/go:underline/);
    expect(html).toContain("group-hover/go:text-[#0F8472]");
    expect(html).toContain("motion-safe:group-hover/go:translate-x-[3px]");
    expect(html).not.toContain(" group-hover/go:translate-x-[3px]");
    expect(html).toContain("focus-visible:outline-[#0F8472]");
  });

  it("サロゲートペアを含むタイトルでも最後の 1 文字を分割しない", () => {
    const html = render("𠮷田の調研費𠮷");

    expect(html).toContain('<span class="whitespace-nowrap">𠮷<span');
  });
});
