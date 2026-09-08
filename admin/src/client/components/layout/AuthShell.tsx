"use client";
import "client-only";

import { useState } from "react";
import type { UserRole } from "@prisma/client";
import Sidebar from "@/client/components/layout/Sidebar";
import { cn } from "@/client/lib/index";

type AuthShellProps = {
  logoutAction: (formData: FormData) => Promise<void>;
  userRole: UserRole | null;
  userEmail: string;
  children: React.ReactNode;
};

/**
 * 認証済み画面の共通シェル（サイドバー + 本文領域）。
 * サイドバーの折りたたみ状態をローカル state で持ち、grid の列幅を追従させる。
 * 本文領域は背景 #F8F8F8 でサイドバーとは独立してスクロールする。
 */
export default function AuthShell({ logoutAction, userRole, userEmail, children }: AuthShellProps) {
  const [collapsed, setCollapsed] = useState(false);

  return (
    <div
      className={cn(
        "grid h-screen bg-background",
        collapsed ? "grid-cols-[72px_minmax(0,1fr)]" : "grid-cols-[236px_minmax(0,1fr)]",
      )}
    >
      <Sidebar
        logoutAction={logoutAction}
        userRole={userRole}
        userEmail={userEmail}
        collapsed={collapsed}
        onToggleCollapsed={() => setCollapsed((prev) => !prev)}
      />
      <main className="min-w-0 overflow-y-auto p-5 text-foreground">{children}</main>
    </div>
  );
}
