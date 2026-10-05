import { transactionsCategoryHref } from "@/client/lib/transactions-category-href";

const href = (query: string, categoryKey: string) =>
  transactionsCategoryHref(
    "/o/sample-party/2026/transactions",
    new URLSearchParams(query),
    categoryKey,
  );

describe("transactionsCategoryHref", () => {
  it("絞り込みが無ければ、そのカテゴリー1つだけを指定した URL にする", () => {
    expect(href("", "office-expenses")).toBe(
      "/o/sample-party/2026/transactions?categories=office-expenses",
    );
  });

  it("並び順や収支の絞り込みは保つ", () => {
    const params = new URL(href("sort=amount&order=asc&filterType=expense", "personnel-costs"), "https://example.com")
      .searchParams;

    expect(Object.fromEntries(params)).toEqual({
      categories: "personnel-costs",
      sort: "amount",
      order: "asc",
      filterType: "expense",
    });
  });

  it("今の絞り込みは置き換える（複数選択されていても1つだけになる）", () => {
    const params = new URL(
      href("categories=personnel-costs,utilities", "utilities"),
      "https://example.com",
    ).searchParams;

    expect(params.get("categories")).toBe("utilities");
  });

  it("絞り込みが変わると件数も変わるので、ページ指定は落として1ページ目に戻す", () => {
    expect(href("page=7", "loans")).toBe("/o/sample-party/2026/transactions?categories=loans");
  });
});
