import {
  getVisibleNavSections,
  isNavItemActive,
} from "@/client/components/layout/sidebar-nav";

describe("getVisibleNavSections", () => {
  it("admin ロールにはすべての項目（ユーザー管理を含む）を表示する", () => {
    const sections = getVisibleNavSections("admin");
    const hrefs = sections.flatMap((s) => s.items.map((i) => i.href));

    expect(sections.map((s) => s.title)).toEqual(["基本情報", "データ取り込み", "報告書"]);
    expect(hrefs).toContain("/users");
    expect(hrefs).toHaveLength(12);
  });

  it("admin 以外のロールには adminOnly の項目を表示しない", () => {
    const sections = getVisibleNavSections("user");
    const hrefs = sections.flatMap((s) => s.items.map((i) => i.href));

    expect(hrefs).not.toContain("/users");
    expect(hrefs).toHaveLength(11);
  });

  it("ロール不明（null）の場合も adminOnly の項目を表示しない", () => {
    const hrefs = getVisibleNavSections(null).flatMap((s) => s.items.map((i) => i.href));

    expect(hrefs).not.toContain("/users");
  });

  it("各項目にハンドオフ対応表どおりのアイコン識別子が設定されている", () => {
    const iconByHref = Object.fromEntries(
      getVisibleNavSections("admin").flatMap((s) => s.items.map((i) => [i.href, i.icon])),
    );

    expect(iconByHref).toEqual({
      "/user-info": "user",
      "/political-organizations": "bank",
      "/users": "users",
      "/transactions": "list-bullets",
      "/bulk-delete-transactions": "trash",
      "/upload-csv": "upload-simple",
      "/balance-snapshots": "coins",
      "/counterparts": "address-book",
      "/assign/counterparts": "link",
      "/donors": "hand-heart",
      "/assign/donors": "link-simple",
      "/export-report": "export",
    });
  });
});

describe("isNavItemActive", () => {
  it("完全一致でアクティブになる", () => {
    expect(isNavItemActive("/transactions", "/transactions")).toBe(true);
  });

  it("配下の詳細画面でも親項目がアクティブになる", () => {
    expect(isNavItemActive("/political-organizations/123/edit", "/political-organizations")).toBe(
      true,
    );
  });

  it("前方が同じだけの別パスはアクティブにならない", () => {
    expect(isNavItemActive("/user-info", "/users")).toBe(false);
    expect(isNavItemActive("/users-archive", "/users")).toBe(false);
  });

  it("/assign 配下の項目は親のマスタ項目をアクティブにしない", () => {
    expect(isNavItemActive("/assign/counterparts", "/counterparts")).toBe(false);
    expect(isNavItemActive("/assign/counterparts", "/assign/counterparts")).toBe(true);
  });

  it("ルート（/）は完全一致のみでアクティブになる", () => {
    expect(isNavItemActive("/", "/")).toBe(true);
    expect(isNavItemActive("/transactions", "/")).toBe(false);
  });
});
