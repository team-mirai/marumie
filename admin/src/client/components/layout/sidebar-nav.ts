import type { AdminTarget } from "@/server/contexts/shared/domain/models/admin-target";
import { type UserRole, UserRoleModel } from "@/server/contexts/auth/domain/models/user-role";

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
  | "export"
  | "download-simple"
  | "database";

type NavItem = {
  href: string;
  label: string;
  icon: NavIconName;
  /** この項目の機能を使えるロール（admin は常に使える） */
  role: UserRole;
  /** 同期用インポートが有効な環境（非本番 かつ DATA_SYNC_IMPORT_ENABLED=true）でのみ表示する */
  syncImportOnly?: boolean;
  badge?: number;
};

type NavSection = {
  title: string;
  items: NavItem[];
};

// アイコン対応表はデザインハンドオフ README「1. サイドバー」節が正

/** 対象が未選択でも操作できる「まず対象を選ぶ／作る」ための入口。 */
const TARGET_MANAGEMENT_SECTION: NavSection = {
  title: "対象の管理",
  items: [
    { href: "/political-organizations", label: "政治団体", icon: "bank", role: "political_fund" },
    { href: "/politicians", label: "議員", icon: "user", role: "research_fund" },
    { href: "/users", label: "ユーザー管理", icon: "users", role: "admin" },
  ],
};

/** 政治団体（× 年度）が選ばれていて初めて操作できるセクション。 */
const ORGANIZATION_SECTIONS: NavSection[] = [
  {
    title: "データ取り込み",
    items: [
      { href: "/transactions", label: "取引一覧", icon: "list-bullets", role: "political_fund" },
      {
        href: "/bulk-delete-transactions",
        label: "取引一括削除",
        icon: "trash",
        role: "political_fund",
      },
      {
        href: "/upload-csv",
        label: "CSVアップロード",
        icon: "upload-simple",
        role: "political_fund",
      },
      { href: "/balance-snapshots", label: "残高登録", icon: "coins", role: "political_fund" },
    ],
  },
  {
    title: "報告書",
    items: [
      {
        href: "/counterparts",
        label: "取引先マスタ",
        icon: "address-book",
        role: "political_fund",
      },
      { href: "/assign/counterparts", label: "取引先紐付け", icon: "link", role: "political_fund" },
      { href: "/donors", label: "寄付者マスタ", icon: "hand-heart", role: "political_fund" },
      {
        href: "/assign/donors",
        label: "寄付者紐付け",
        icon: "link-simple",
        role: "political_fund",
      },
      {
        href: "/export-report",
        label: "報告書エクスポート",
        icon: "export",
        role: "political_fund",
      },
    ],
  },
  {
    title: "データ同期",
    items: [
      { href: "/sync-export", label: "同期用エクスポート", icon: "database", role: "admin" },
      {
        href: "/sync-import",
        label: "同期用インポート",
        icon: "database",
        role: "admin",
        syncImportOnly: true,
      },
    ],
  },
];

/** 環境によって出し分ける nav 項目の可否。サーバー側で判定した結果を渡す。 */
type NavEnvironment = {
  /** 同期用インポートが利用できる環境か（既定は不可。本番では必ず false） */
  syncImportEnabled?: boolean;
};

/**
 * ユーザーのロールと現在のグローバル対象に応じて表示可能な nav セクションを返す。
 * 各項目はその機能を使えるロール（admin は全項目）にのみ表示し、項目が空になったセクションは除外する。
 * 対象が未選択のときは、開いても「政治団体が選択されていません」としか言えない
 * データ取り込み・報告書のセクションを出さず、対象の管理だけに絞る。
 */
export function getVisibleNavSections(
  userRoles: readonly UserRole[],
  target: AdminTarget | null = null,
  environment: NavEnvironment = {},
): NavSection[] {
  const base = target?.kind === "research-fund" ? `/politicians/${target.politicianId}/books` : "";
  const sections: NavSection[] =
    target?.kind === "research-fund"
      ? [
          {
            title: "議員室",
            items: [
              { href: "/politicians", label: "議員", icon: "user", role: "research_fund" },
              { href: base, label: "年度帳簿", icon: "bank", role: "research_fund" },
              { href: "/users", label: "ユーザー管理", icon: "users", role: "admin" },
            ],
          },
          {
            title: "調査研究費",
            items: [
              {
                href: `${base}/${target.bookId}/scan`,
                label: "書類スキャン",
                icon: "upload-simple",
                role: "research_fund",
              },
              {
                href: `${base}/${target.bookId}/entries`,
                label: "仕訳の確認・編集",
                icon: "list-bullets",
                role: "research_fund",
                badge: target.draftCount,
              },
              {
                href: `${base}/${target.bookId}/payees`,
                label: "支払先",
                icon: "address-book",
                role: "research_fund",
              },
              {
                href: `${base}/${target.bookId}/grants`,
                label: "支給の登録",
                icon: "coins",
                role: "research_fund",
              },
              {
                href: `${base}/${target.bookId}/publish`,
                label: "公開",
                icon: "export",
                role: "research_fund",
              },
              {
                href: `${base}/${target.bookId}/submission`,
                label: "議員課提出",
                icon: "download-simple",
                role: "research_fund",
              },
              {
                href: `${base}/${target.bookId}/expenditure-groups`,
                label: "支出群と成果",
                icon: "hand-heart",
                role: "research_fund",
              },
              {
                href: `${base}/${target.bookId}/prompts`,
                label: "読み取りプロンプト",
                icon: "list-bullets",
                role: "research_fund",
              },
            ],
          },
        ]
      : target === null
        ? [TARGET_MANAGEMENT_SECTION]
        : [TARGET_MANAGEMENT_SECTION, ...ORGANIZATION_SECTIONS];
  return sections
    .map((section) => ({
      ...section,
      items: section.items.filter(
        (item) =>
          UserRoleModel.canUse(userRoles, [item.role]) &&
          (!item.syncImportOnly || environment.syncImportEnabled === true),
      ),
    }))
    .filter((section) => section.items.length > 0);
}

/**
 * 現在のパスが nav 項目に対応する画面かを判定する。
 * ルート以外は前方一致（配下の詳細画面でも親項目をアクティブにする）。
 */
export function isNavItemActive(pathname: string, href: string): boolean {
  if (href === "/politicians")
    return (
      pathname === href ||
      pathname === `${href}/new` ||
      /^\/politicians\/[^/]+\/edit$/.test(pathname)
    );
  if (/^\/politicians\/[^/]+\/books$/.test(href)) return pathname === href;
  if (href === "/") {
    return pathname === "/";
  }
  return pathname === href || pathname.startsWith(`${href}/`);
}
