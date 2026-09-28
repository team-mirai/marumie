import { getFooterTextLinks } from "@/client/lib/footer-navigation";

const ANCHOR_LABELS = [
  "TOP",
  "収支の流れ",
  "月ごとの収支推移",
  "貸借対照表",
  "すべての出入金",
  "データについて",
  "チームみらいについて",
];

function hrefOf(links: ReturnType<typeof getFooterTextLinks>, label: string) {
  return links.find((link) => link.label === label)?.href;
}

describe("getFooterTextLinks", () => {
  it("政治団体ページでは /o/[slug]/ のセクションを指す", () => {
    const links = getFooterTextLinks("/o/sample-party/2026");

    expect(links.slice(0, 7)).toEqual([
      { label: "TOP", href: "/o/sample-party/#top" },
      { label: "収支の流れ", href: "/o/sample-party/#cash-flow" },
      { label: "月ごとの収支推移", href: "/o/sample-party/#monthly-trends" },
      { label: "貸借対照表", href: "/o/sample-party/#balance-sheet" },
      { label: "すべての出入金", href: "/o/sample-party/#transactions" },
      { label: "データについて", href: "/o/sample-party/#explanation" },
      { label: "チームみらいについて", href: "/o/sample-party/#about" },
    ]);
  });

  it("/o/ 以外のページでは既定の政治団体を指す", () => {
    expect(hrefOf(getFooterTextLinks("/terms"), "収支の流れ")).toBe("/o/team-mirai/#cash-flow");
  });

  it("調研費ページでは同じページ内のセクションを指す", () => {
    const links = getFooterTextLinks("/p/sample-taro/2026");

    expect(hrefOf(links, "収支の流れ")).toBe("/p/sample-taro/2026/#cash-flow");
    expect(hrefOf(links, "月ごとの収支推移")).toBe("/p/sample-taro/2026/#monthly-trends");
    expect(hrefOf(links, "すべての出入金")).toBe("/p/sample-taro/2026/#transactions");
    expect(hrefOf(links, "データについて")).toBe("/p/sample-taro/2026/#explanation");
    expect(hrefOf(links, "チームみらいについて")).toBe("/p/sample-taro/2026/#about");
  });

  it("調研費の全件ページでも、その調研費ページのセクションを指す", () => {
    const links = getFooterTextLinks("/p/sample-taro/2025/transactions");

    expect(hrefOf(links, "収支の流れ")).toBe("/p/sample-taro/2025/#cash-flow");
    expect(hrefOf(links, "すべての出入金")).toBe("/p/sample-taro/2025/#transactions");
  });

  it("調研費ページでも並びは政治団体ページと同じで、貸借対照表は既定の政治団体を指す", () => {
    const links = getFooterTextLinks("/p/sample-taro/2026");

    expect(links.slice(0, 7).map((link) => link.label)).toEqual(ANCHOR_LABELS);
    expect(hrefOf(links, "貸借対照表")).toBe("/o/team-mirai/#balance-sheet");
  });

  it("応援・規約などのリンクはページによらず同じ", () => {
    const organization = getFooterTextLinks("/o/sample-party/2026").slice(7);
    const politician = getFooterTextLinks("/p/sample-taro/2026").slice(7);

    expect(politician).toEqual(organization);
  });

  it("年度の無い調研費ページの URL では既定の年度を使う", () => {
    expect(hrefOf(getFooterTextLinks("/p/sample-taro"), "収支の流れ")).toBe(
      "/p/sample-taro/2026/#cash-flow",
    );
  });
});
