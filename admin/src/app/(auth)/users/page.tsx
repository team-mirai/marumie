import "server-only";
import { requireRole, getAllUsers } from "@/server/contexts/auth";
import { redirect } from "next/navigation";
import UserManagement from "@/client/components/user-management/UserManagement";

export default async function UsersPage() {
  const hasAccess = await requireRole("admin");

  if (!hasAccess) {
    redirect("/login");
  }

  const rawUsers = await getAllUsers();
  // クライアントに渡すのに必要最小限のフィールドのみに絞る（authId等を漏らさない）
  const users = rawUsers.map((u) => ({
    id: u.id,
    email: u.email,
    role: u.role,
    createdAt: u.createdAt,
  }));

  return (
    <div className="bg-card rounded-xl p-4">
      <h1 className="text-2xl font-bold text-white mb-4">ユーザー管理</h1>
      <UserManagement users={users} availableRoles={["user", "admin"]} />
    </div>
  );
}
