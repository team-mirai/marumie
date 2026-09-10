import "server-only";
import { redirect } from "next/navigation";
import { loadAdminTargets } from "@/server/contexts/shared/presentation/loaders/load-admin-targets";
import AuthShell from "@/client/components/layout/AuthShell";
import { logout } from "@/server/contexts/auth/presentation/actions/logout";
import { getCurrentUser } from "@/server/contexts/auth/presentation/loaders/load-current-user";

// 認証チェックでcookiesを使用するため動的レンダリングを強制
export const dynamic = "force-dynamic";

export default async function AuthLayout({ children }: { children: React.ReactNode }) {
  const user = await getCurrentUser();

  if (!user) {
    redirect("/login");
  }

  const { targets, currentTarget, cookieName } = await loadAdminTargets();

  return (
    <AuthShell
      logoutAction={logout}
      userRole={user.role}
      userEmail={user.email}
      targets={targets}
      currentTarget={currentTarget}
      syncKey={cookieName}
    >
      {children}
    </AuthShell>
  );
}
