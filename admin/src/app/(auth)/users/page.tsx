import "server-only";
import { loadAllUsers } from "@/server/contexts/auth/presentation/loaders/load-all-users";
import { updateUserRoles } from "@/server/contexts/auth/presentation/actions/update-user-roles";
import { inviteUser } from "@/server/contexts/auth/presentation/actions/invite-user";
import { USER_ROLES } from "@/server/contexts/auth/domain/models/user-role";
import UserManagement from "@/client/components/user-management/UserManagement";
import { PageHeader } from "@/client/components/layout/PageHeader";
import { requireRolePage } from "@/server/contexts/auth/presentation/loaders/require-role-page";

export default async function UsersPage() {
  await requireRolePage("admin");
  const rawUsers = await loadAllUsers();
  // クライアントに渡すのに必要最小限のフィールドのみに絞る（authId等を漏らさない）
  const users = rawUsers.map((u) => ({
    id: u.id,
    email: u.email,
    roles: u.roles,
    createdAt: u.createdAt,
  }));

  return (
    <div>
      <PageHeader label="Users" title="ユーザー管理" />
      <UserManagement
        users={users}
        availableRoles={USER_ROLES}
        updateUserRolesAction={updateUserRoles}
        inviteUserAction={inviteUser}
      />
    </div>
  );
}
