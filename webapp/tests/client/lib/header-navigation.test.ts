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
      "/o/team-mirai/2025/#explanation",
      "https://team-mirai.notion.site/FAQ-27ef6f56bae180c085e9f97d05a5d59c",
    ]);
  });

  it("議員ページでは同じページ内のセクション（B-1〜B-5）を指す", () => {
    const { homeHref, items } = getHeaderNavigation("politician", "sample-taro", 2026);

    expect(homeHref).toBe("/p/sample-taro/2026/");
    expect(items.map((item) => item.href)).toEqual([
      "/p/sample-taro/2026/#cash-flow",
      "/p/sample-taro/2026/#highlights",
      "/p/sample-taro/2026/#monthly-trends",
      "/p/sample-taro/2026/#transactions",
      "/p/sample-taro/2026/#explanation",
      "https://team-mirai.notion.site/FAQ-27ef6f56bae180c085e9f97d05a5d59c",
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
