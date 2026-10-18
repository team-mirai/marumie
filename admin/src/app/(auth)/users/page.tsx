import "server-only";
import { loadAllUsers } from "@/server/contexts/auth/presentation/loaders/load-all-users";
import { updateUserRoles } from "@/server/contexts/auth/presentation/actions/update-user-roles";
import { updateUserAssignments } from "@/server/contexts/auth/presentation/actions/update-user-assignments";
import { loadPoliticians } from "@/server/contexts/shared/presentation/loaders/load-politicians";
import { inviteUser } from "@/server/contexts/auth/presentation/actions/invite-user";
import { USER_ROLES } from "@/server/contexts/auth/domain/models/user-role";
import UserManagement from "@/client/components/user-management/UserManagement";
import { PageHeader } from "@/client/components/layout/PageHeader";
import { requireRolePage } from "@/server/contexts/auth/presentation/loaders/require-role-page";

export default async function UsersPage() {
  await requireRolePage("admin");
  const [rawUsers, politicians] = await Promise.all([loadAllUsers(), loadPoliticians()]);
  // クライアントに渡すのに必要最小限のフィールドのみに絞る（authId等を漏らさない）
  const users = rawUsers.map((u) => ({
    id: u.id,
    email: u.email,
    roles: u.roles,
    assignedPoliticianIds: u.assignedPoliticianIds,
    createdAt: u.createdAt,
  }));

  return (
    <div>
      <PageHeader label="Users" title="ユーザー管理" />
      <UserManagement
        users={users}
        availableRoles={USER_ROLES}
        politicians={politicians.map((p) => ({ id: p.id, name: p.name }))}
        updateUserRolesAction={updateUserRoles}
        updateUserAssignmentsAction={updateUserAssignments}
        inviteUserAction={inviteUser}
      />
    </div>
  );
}
