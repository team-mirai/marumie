import {
  getVisibleNavSections,
  isNavItemActive,
} from "@/client/components/layout/sidebar-nav";

describe("getVisibleNavSections", () => {
  it("admin ロールにはすべての項目（ユーザー管理を含む）を表示する", () => {
    const sections = getVisibleNavSections("admin");
    const hrefs = sections.flatMap((s) => s.items.map((i) => i.href));

    expect(sections.map((s) => s.title)).toEqual(["政治団体", "データ取り込み", "報告書"]);
    expect(hrefs).toContain("/users");
    expect(hrefs).toHaveLength(13);
  });

  it("admin 以外のロールには adminOnly の項目を表示しない", () => {
    const sections = getVisibleNavSections("user");
    const hrefs = sections.flatMap((s) => s.items.map((i) => i.href));

    expect(hrefs).not.toContain("/users");
    expect(hrefs).toHaveLength(12);
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
      "/politicians": "user",
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


describe("議員室モード", () => {
  const target = { kind: "research-fund" as const, key: "book:7", name: "議員A", year: 2026, politicianId: "3", bookId: "7", draftCount: 4 };
  it("選択した議員・帳簿のリンクと下書き件数を使う", () => {
    const sections = getVisibleNavSections("user", target);
    expect(sections.map((s) => s.title)).toEqual(["議員室", "調査研究費"]);
    expect(sections[0].items.map((i) => i.href)).toEqual(["/politicians", "/politicians/3/books", "/user-info"]);
    expect(sections[1].items).toHaveLength(6);
    expect(sections[1].items.every((i) => i.href.startsWith("/politicians/3/books/7/"))).toBe(true);
    expect(sections[1].items.find((i) => i.label === "仕訳の確認・編集")?.badge).toBe(4);
  });
  it("議員室モードでもユーザー管理は admin のみ表示する", () => {
    expect(getVisibleNavSections("admin", target)[0].items.map((i) => i.href)).toContain("/users");
    expect(getVisibleNavSections(null, target)[0].items.map((i) => i.href)).not.toContain("/users");
  });
  it("下書きが0件の場合も0を返し、他の帳簿の件数と混ざらない", () => {
    expect(getVisibleNavSections("user", { ...target, bookId: "8", draftCount: 0 })[1].items[1]).toMatchObject({ href: "/politicians/3/books/8/entries", badge: 0 });
  });
  it("帳簿や仕訳画面で議員リンクを二重にアクティブにしない", () => {
    expect(isNavItemActive("/politicians/3/books", "/politicians")).toBe(false);
    expect(isNavItemActive("/politicians/3/edit", "/politicians")).toBe(true);
    expect(isNavItemActive("/politicians/3/books/7/entries", "/politicians/3/books")).toBe(false);
    expect(isNavItemActive("/politicians/3/books/7/entries", "/politicians/3/books/7/entries")).toBe(true);
  });
});
