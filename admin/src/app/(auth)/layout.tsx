import "server-only";
import { redirect } from "next/navigation";
import Sidebar from "@/client/components/layout/Sidebar";
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
    <div className="grid grid-cols-[220px_1fr] h-screen bg-background">
      <Sidebar logoutAction={logout} userRole={user.role} />
      <main className="p-5 overflow-auto text-foreground">{children}</main>
    </div>
  );
}
