import "server-only";
import { requireRole } from "@/server/contexts/auth/application/roles";
import { redirect } from "next/navigation";
import { prisma } from "@/server/contexts/shared/infrastructure/prisma";
import { PrismaUserRepository } from "@/server/contexts/common/infrastructure/repositories/prisma-user.repository";
import UserManagement from "@/client/components/user-management/UserManagement";
const userRepository = new PrismaUserRepository(prisma);

export default async function UsersPage() {
  const hasAccess = await requireRole("admin");

  if (!hasAccess) {
    redirect("/login");
  }

  const users = await userRepository.findAll();

  return (
    <div className="bg-primary-panel rounded-xl p-4">
      <h1 className="text-2xl font-bold text-white mb-4">ユーザー管理</h1>
      <UserManagement users={users} availableRoles={["user", "admin"]} />
    </div>
  );
}
