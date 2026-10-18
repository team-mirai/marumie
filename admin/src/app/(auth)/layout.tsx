import "server-only";
import { redirect } from "next/navigation";
import { loadAdminTargets } from "@/server/contexts/shared/presentation/loaders/load-admin-targets";
import AuthShell from "@/client/components/layout/AuthShell";
import { NoRoleNotice } from "@/client/components/layout/NoRoleNotice";
import { UserRoleModel } from "@/server/contexts/auth/domain/models/user-role";
import { logout } from "@/server/contexts/auth/presentation/actions/logout";
import { getCurrentUser } from "@/server/contexts/auth/presentation/loaders/load-current-user";
import { isSyncImportAvailable } from "@/server/contexts/data-import/presentation/loaders/read-sync-import-environment";

// 認証チェックでcookiesを使用するため動的レンダリングを強制
export const dynamic = "force-dynamic";

export default async function AuthLayout({ children }: { children: React.ReactNode }) {
  const user = await getCurrentUser();

  if (!user) {
    redirect("/login");
  }

  // ロールを 1 つも持たないユーザーには案内だけを出し、どの画面も描画しない
  // （各ページ・サーバーアクションもロールのガードで拒否する）。
  if (UserRoleModel.hasNoRole(user.roles)) {
    return <NoRoleNotice userEmail={user.email} logoutAction={logout} />;
  }

  const { targets, currentTarget, cookieName } = await loadAdminTargets();

  return (
    <AuthShell
      logoutAction={logout}
      userRoles={user.roles}
      userEmail={user.email}
      syncImportEnabled={isSyncImportAvailable()}
      targets={targets}
      currentTarget={currentTarget}
      syncKey={cookieName}
    >
      {children}
    </AuthShell>
  );
}
