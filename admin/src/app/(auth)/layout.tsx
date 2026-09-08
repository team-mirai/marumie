import "server-only";
import { redirect } from "next/navigation";
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

  return (
    <AuthShell logoutAction={logout} userRole={user.role} userEmail={user.email}>
      {children}
    </AuthShell>
  );
}
