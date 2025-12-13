import "server-only";
import { requireRole, getAllUsers } from "@/server/contexts/auth";
import { redirect } from "next/navigation";
import UserManagement from "@/client/components/user-management/UserManagement";

export default async function UsersPage() {
  const hasAccess = await requireRole("admin");

  if (!hasAccess) {
    redirect("/login");
  }

  const users = await getAllUsers();

  return (
    <div className="bg-primary-panel rounded-xl p-4">
      <h1 className="text-2xl font-bold text-white mb-4">ユーザー管理</h1>
      <UserManagement users={users} availableRoles={["user", "admin"]} />
    </div>
  );
}
