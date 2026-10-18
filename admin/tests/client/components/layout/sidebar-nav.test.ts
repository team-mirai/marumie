import {
  getVisibleNavSections,
  isNavItemActive,
} from "@/client/components/layout/sidebar-nav";

const organizationTarget = {
  kind: "political-organization" as const,
  key: "org:1",
  name: "サンプル党",
  year: 2025,
  organizationId: "1",
};

type Roles = Parameters<typeof getVisibleNavSections>[0];
const PF_ONLY: Roles = ["political_fund"];
const RF_ONLY: Roles = ["research_fund"];
const BOTH: Roles = ["political_fund", "research_fund"];
const hrefsOf = (sections: ReturnType<typeof getVisibleNavSections>) =>
  sections.flatMap((s) => s.items.map((i) => i.href));

describe("getVisibleNavSections", () => {
  it("「ユーザー情報」ページは廃止したのでどのロールにも出さない", () => {
    for (const roles of [["admin"], PF_ONLY, RF_ONLY] as Roles[]) {
      expect(hrefsOf(getVisibleNavSections(roles, organizationTarget))).not.toContain("/user-info");
    }
  });

  it("admin ロールにはすべての項目（ユーザー管理を含む）を表示する", () => {
    const sections = getVisibleNavSections(["admin"], organizationTarget);
    const hrefs = hrefsOf(sections);

    expect(sections.map((s) => s.title)).toEqual([
      "対象の管理",
      "データ取り込み",
      "報告書",
      "データ同期",
    ]);
    expect(hrefs).toContain("/users");
    expect(hrefs).toHaveLength(13);
  });

  it("対象の管理は政治団体・議員の順に並べる", () => {
    const [first] = getVisibleNavSections(["admin"], organizationTarget);

    expect(first.title).toBe("対象の管理");
    expect(first.items.map((i) => i.href)).toEqual([
      "/political-organizations",
      "/politicians",
      "/users",
    ]);
  });

  it("対象が未選択なら対象の管理だけを出し、データ取り込み・報告書は出さない", () => {
    const sections = getVisibleNavSections(["admin"], null);

    expect(sections.map((s) => s.title)).toEqual(["対象の管理"]);
    expect(hrefsOf(sections)).toEqual(["/political-organizations", "/politicians", "/users"]);
  });

  it("political_fund だけのユーザーには議員（調査研究費）とユーザー管理を出さない", () => {
    expect(hrefsOf(getVisibleNavSections(PF_ONLY, null))).toEqual(["/political-organizations"]);

    const hrefs = hrefsOf(getVisibleNavSections(PF_ONLY, organizationTarget));
    expect(hrefs).not.toContain("/politicians");
    expect(hrefs).not.toContain("/users");
    expect(hrefs).toContain("/transactions");
    expect(hrefs).toHaveLength(10);
  });

  it("research_fund だけのユーザーには政治団体と政治資金系の項目を出さない", () => {
    expect(hrefsOf(getVisibleNavSections(RF_ONLY, null))).toEqual(["/politicians"]);
  });

  it("両方のロールを持つユーザーには政治団体と議員の両方を出し、admin 限定の項目は出さない", () => {
    expect(hrefsOf(getVisibleNavSections(BOTH, null))).toEqual([
      "/political-organizations",
      "/politicians",
    ]);
    expect(hrefsOf(getVisibleNavSections(BOTH, organizationTarget))).toHaveLength(11);
  });

  it("ロールを 1 つも持たないユーザーには何も出さない", () => {
    expect(getVisibleNavSections([], null)).toEqual([]);
    expect(getVisibleNavSections([], organizationTarget)).toEqual([]);
  });

  it("同期用エクスポートは admin にだけ出し、非 admin にはセクションごと出さない", () => {
    const titlesFor = (roles: Roles) =>
      getVisibleNavSections(roles, organizationTarget).map((s) => s.title);
    const hrefsFor = (roles: Roles) => hrefsOf(getVisibleNavSections(roles, organizationTarget));

    expect(hrefsFor(["admin"])).toContain("/sync-export");
    expect(hrefsFor(BOTH)).not.toContain("/sync-export");
    expect(hrefsFor([])).not.toContain("/sync-export");
    expect(titlesFor(BOTH)).not.toContain("データ同期");
  });

  it("同期用インポートは、有効な環境の admin にだけ出す", () => {
    const hrefsFor = (roles: Roles, environment?: { syncImportEnabled?: boolean }) =>
      hrefsOf(getVisibleNavSections(roles, organizationTarget, environment));

    // 既定（本番・フラグ未設定）では admin にも出さない
    expect(hrefsFor(["admin"])).not.toContain("/sync-import");
    expect(hrefsFor(["admin"], { syncImportEnabled: false })).not.toContain("/sync-import");
    expect(hrefsFor(["admin"], { syncImportEnabled: true })).toContain("/sync-import");
    expect(hrefsFor(BOTH, { syncImportEnabled: true })).not.toContain("/sync-import");
  });

  it("各項目にハンドオフ対応表どおりのアイコン識別子が設定されている", () => {
    const iconByHref = Object.fromEntries(
      getVisibleNavSections(["admin"], organizationTarget).flatMap((s) =>
        s.items.map((i) => [i.href, i.icon]),
      ),
    );

    expect(iconByHref).toEqual({
      "/politicians": "user",
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
      "/sync-export": "database",
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
    const sections = getVisibleNavSections(RF_ONLY, target);
    expect(sections.map((s) => s.title)).toEqual(["議員室", "調査研究費"]);
    expect(sections[0].items.map((i) => i.href)).toEqual(["/politicians", "/politicians/3/books"]);
    expect(sections[1].items).toHaveLength(8);
    expect(sections[1].items.every((i) => i.href.startsWith("/politicians/3/books/7/"))).toBe(true);
    expect(sections[1].items.find((i) => i.label === "仕訳の確認・編集")?.badge).toBe(4);
  });
  it("議員室モードでもユーザー管理は admin のみ表示する", () => {
    expect(getVisibleNavSections(["admin"], target)[0].items.map((i) => i.href)).toContain("/users");
    expect(getVisibleNavSections(RF_ONLY, target)[0].items.map((i) => i.href)).not.toContain("/users");
  });
  it("political_fund だけのユーザーには議員室・調査研究費の項目を出さない", () => {
    expect(getVisibleNavSections(PF_ONLY, target)).toEqual([]);
  });
  it("下書きが0件の場合も0を返し、他の帳簿の件数と混ざらない", () => {
    expect(getVisibleNavSections(RF_ONLY, { ...target, bookId: "8", draftCount: 0 })[1].items[1]).toMatchObject({ href: "/politicians/3/books/8/entries", badge: 0 });
  });
  it("帳簿や仕訳画面で議員リンクを二重にアクティブにしない", () => {
    expect(isNavItemActive("/politicians/3/books", "/politicians")).toBe(false);
    expect(isNavItemActive("/politicians/3/edit", "/politicians")).toBe(true);
    expect(isNavItemActive("/politicians/3/books/7/entries", "/politicians/3/books")).toBe(false);
    expect(isNavItemActive("/politicians/3/books/7/entries", "/politicians/3/books/7/entries")).toBe(true);
  });
});
