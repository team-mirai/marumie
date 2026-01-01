"use client";
import "client-only";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { UserRole } from "@prisma/client";
import { Button } from "@/client/components/ui";

type NavItem = {
  href: string;
  label: string;
  adminOnly?: boolean;
};

type NavSection = {
  title: string;
  items: NavItem[];
};

export default function Sidebar({
  logoutAction,
  userRole,
}: {
  logoutAction: (formData: FormData) => Promise<void>;
  userRole: UserRole | null;
}) {
  const pathname = usePathname();

  const isActive = (path: string) => {
    if (path === "/") {
      return pathname === "/";
    }
    return pathname.startsWith(path);
  };

  const navSections: NavSection[] = [
    {
      title: "基本情報",
      items: [
        { href: "/user-info", label: "ユーザー情報" },
        { href: "/political-organizations", label: "政治団体" },
        { href: "/users", label: "ユーザー管理", adminOnly: true },
      ],
    },
    {
      title: "データ取り込み",
      items: [
        { href: "/transactions", label: "取引一覧" },
        { href: "/upload-csv", label: "CSVアップロード" },
        { href: "/balance-snapshots", label: "残高登録" },
      ],
    },
    {
      title: "報告書",
      items: [
        { href: "/counterparts", label: "取引先マスタ" },
        { href: "/assign/counterparts", label: "取引先紐付け" },
        { href: "/donors", label: "寄付者マスタ" },
        { href: "/assign/donors", label: "寄付者紐付け" },
        { href: "/export-report", label: "報告書エクスポート" },
      ],
    },
  ];

  return (
    <aside className="bg-card p-4 flex flex-col h-full">
      <nav className="flex flex-col gap-6">
        {navSections.map((section) => {
          const visibleItems = section.items.filter(
            (item) => !item.adminOnly || userRole === "admin",
          );
          if (visibleItems.length === 0) return null;

          return (
            <div key={section.title}>
              <h3 className="text-muted-foreground text-xs font-medium uppercase tracking-wider mb-1 px-2.5">
                {section.title}
              </h3>
              <div className="flex flex-col gap-0.5">
                {visibleItems.map((item) => (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={`text-foreground no-underline px-2.5 py-2 rounded-lg transition-colors duration-200 ${
                      isActive(item.href) ? "bg-secondary" : "hover:bg-secondary"
                    }`}
                  >
                    {item.label}
                  </Link>
                ))}
              </div>
            </div>
          );
        })}
      </nav>
      <div className="mt-auto pt-4">
        <form action={logoutAction}>
          <Button type="submit" variant="destructive" className="w-full">
            ログアウト
          </Button>
        </form>
      </div>
    </aside>
  );
}
