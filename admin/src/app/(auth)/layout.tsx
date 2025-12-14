import "server-only";
import { redirect } from "next/navigation";
import Sidebar from "@/client/components/layout/Sidebar";
import {
  logout,
  getCurrentUser,
  getCurrentUserRole,
} from "@/server/contexts/auth";

export default async function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await getCurrentUser();

  if (!user) {
    redirect("/login");
  }

  const userRole = await getCurrentUserRole();

  return (
    <div className="grid grid-cols-[220px_1fr] h-screen">
      <Sidebar logoutAction={logout} userRole={userRole} />
      <main className="p-5 overflow-auto">{children}</main>
    </div>
  );
}
