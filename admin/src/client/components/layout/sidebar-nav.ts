import type { UserRole } from "@prisma/client";

/**
 * サイドバーの nav 項目に使う Phosphor アイコンの識別子。
 * 実際のアイコンコンポーネントへの対応は Sidebar.tsx 側で行う
 * （このモジュールは純粋なデータ / 判定ロジックのみを持ち、ユニットテスト可能に保つ）。
 */
export type NavIconName =
  | "user"
  | "bank"
  | "users"
  | "list-bullets"
  | "trash"
  | "upload-simple"
  | "coins"
  | "address-book"
  | "link"
  | "hand-heart"
  | "link-simple"
  | "export";

type NavItem = {
  href: string;
  label: string;
  icon: NavIconName;
  adminOnly?: boolean;
};

type NavSection = {
  title: string;
  items: NavItem[];
};

// アイコン対応表はデザインハンドオフ README「1. サイドバー」節が正
const NAV_SECTIONS: NavSection[] = [
  {
    title: "基本情報",
    items: [
      { href: "/user-info", label: "ユーザー情報", icon: "user" },
      { href: "/political-organizations", label: "政治団体", icon: "bank" },
      { href: "/users", label: "ユーザー管理", icon: "users", adminOnly: true },
    ],
  },
  {
    title: "データ取り込み",
    items: [
      { href: "/transactions", label: "取引一覧", icon: "list-bullets" },
      { href: "/bulk-delete-transactions", label: "取引一括削除", icon: "trash" },
      { href: "/upload-csv", label: "CSVアップロード", icon: "upload-simple" },
      { href: "/balance-snapshots", label: "残高登録", icon: "coins" },
    ],
  },
  {
    title: "報告書",
    items: [
      { href: "/counterparts", label: "取引先マスタ", icon: "address-book" },
      { href: "/assign/counterparts", label: "取引先紐付け", icon: "link" },
      { href: "/donors", label: "寄付者マスタ", icon: "hand-heart" },
      { href: "/assign/donors", label: "寄付者紐付け", icon: "link-simple" },
      { href: "/export-report", label: "報告書エクスポート", icon: "export" },
    ],
  },
];

/**
 * ユーザーのロールに応じて表示可能な nav セクションを返す。
 * adminOnly の項目は admin ロールにのみ表示し、項目が空になったセクションは除外する。
 */
export function getVisibleNavSections(userRole: UserRole | null): NavSection[] {
  return NAV_SECTIONS.map((section) => ({
    ...section,
    items: section.items.filter((item) => !item.adminOnly || userRole === "admin"),
  })).filter((section) => section.items.length > 0);
}

/**
 * 現在のパスが nav 項目に対応する画面かを判定する。
 * ルート以外は前方一致（配下の詳細画面でも親項目をアクティブにする）。
 */
export function isNavItemActive(pathname: string, href: string): boolean {
  if (href === "/") {
    return pathname === "/";
  }
  return pathname === href || pathname.startsWith(`${href}/`);
}
