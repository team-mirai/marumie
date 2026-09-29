import { getHeaderNavigation } from "@/client/lib/header-navigation";

describe("getHeaderNavigation", () => {
  it("政治団体ページでは /o/[slug]/[year] のセクションを指す", () => {
    const { homeHref, items } = getHeaderNavigation("organization", "team-mirai", 2025);

    expect(homeHref).toBe("/o/team-mirai/2025/");
    expect(items.map((item) => item.href)).toEqual([
      "/o/team-mirai/2025/#cash-flow",
      "/o/team-mirai/2025/#monthly-trends",
      "/o/team-mirai/2025/#balance-sheet",
      "/o/team-mirai/2025/#transactions",
      "/o/team-mirai/2025/#research-fund",
      "/o/team-mirai/2025/#explanation",
      "https://team-mirai.notion.site/FAQ-27ef6f56bae180c085e9f97d05a5d59c",
    ]);
  });

  it("調研費の導線を隠す設定なら、政治団体ページのナビに調査研究費を出さない", () => {
    const { items } = getHeaderNavigation("organization", "team-mirai", 2025, {
      showResearchFund: false,
    });

    expect(items.map((item) => item.label)).toEqual([
      "収支の流れ",
      "1年間の推移",
      "貸借対照表",
      "すべての出入金",
      "データについて",
      "よくあるご質問",
    ]);
  });

  it("調研費ページでは同じページ内のセクションを指す", () => {
    const { homeHref, items } = getHeaderNavigation("politician", "sample-taro", 2026);

    expect(homeHref).toBe("/p/sample-taro/2026/");
    expect(items).toEqual([
      { href: "/p/sample-taro/2026/#cash-flow", label: "収支の流れ" },
      { href: "/p/sample-taro/2026/#monthly-trends", label: "1年間の推移" },
      { href: "/p/sample-taro/2026/#transactions", label: "すべての出入金" },
      { href: "/p/sample-taro/2026/#explanation", label: "データについて" },
      {
        href: "https://team-mirai.notion.site/FAQ-27ef6f56bae180c085e9f97d05a5d59c",
        label: "よくあるご質問",
      },
    ]);
  });

  it("議員ページのナビは政治団体ページ（/o/）へ飛ばない", () => {
    const { items } = getHeaderNavigation("politician", "sample-taro", 2026);

    expect(items.filter((item) => item.href.startsWith("/o/"))).toEqual([]);
  });

  it("slug は URL エンコードする", () => {
    expect(getHeaderNavigation("politician", "a/b", 2026).homeHref).toBe("/p/a%2Fb/2026/");
  });
});
