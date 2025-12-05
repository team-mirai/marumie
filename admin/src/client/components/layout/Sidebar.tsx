"use client";
import "client-only";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { UserRole } from "@prisma/client";
import { Button } from "@/client/components/ui";

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

  const navItems = [
    { href: "/user-info", label: "ユーザー情報" },
    { href: "/political-organizations", label: "政治団体" },
    { href: "/transactions", label: "取引一覧" },
    { href: "/balance-snapshots", label: "残高登録" },
    { href: "/upload-csv", label: "CSVアップロード" },
    { href: "/xml-export", label: "XML出力" },
    { href: "/users", label: "ユーザー管理", adminOnly: true },
  ];

  return (
    <aside className="bg-primary-panel p-4 flex flex-col h-full">
      <h2 className="text-primary-muted text-lg font-medium mb-3 mt-0">
        管理画面
      </h2>
      <nav className="flex flex-col gap-2">
        {navItems.map(
          (item) =>
            (!item.adminOnly || userRole === "admin") && (
              <Link
                key={item.href}
                href={item.href}
                className={`text-white no-underline px-2.5 py-2 rounded-lg transition-colors duration-200 ${
                  isActive(item.href)
                    ? "bg-primary-hover"
                    : "hover:bg-primary-hover"
                }`}
              >
                {item.label}
              </Link>
            ),
        )}
      </nav>
      <div className="mt-auto pt-4">
        <form action={logoutAction}>
          <Button type="submit" variant="danger" fullWidth>
            ログアウト
          </Button>
        </form>
      </div>
    </aside>
  );
}
