import "server-only";
import { loadAllUsers } from "@/server/contexts/auth/presentation/loaders/load-all-users";
import { loadUserInvitations } from "@/server/contexts/auth/presentation/loaders/load-user-invitations";
import { registerUserInvitation } from "@/server/contexts/auth/presentation/actions/register-user-invitation";
import { cancelUserInvitation } from "@/server/contexts/auth/presentation/actions/cancel-user-invitation";
import { updateUserRoles } from "@/server/contexts/auth/presentation/actions/update-user-roles";
import { updateUserAssignments } from "@/server/contexts/auth/presentation/actions/update-user-assignments";
import { loadPoliticians } from "@/server/contexts/shared/presentation/loaders/load-politicians";
import { inviteUser } from "@/server/contexts/auth/presentation/actions/invite-user";
import { USER_ROLES } from "@/server/contexts/auth/domain/models/user-role";
import UserManagement from "@/client/components/user-management/UserManagement";
import UserInvitations from "@/client/components/user-management/UserInvitations";
import { PageHeader } from "@/client/components/layout/PageHeader";
import { requireRolePage } from "@/server/contexts/auth/presentation/loaders/require-role-page";

export default async function UsersPage() {
  await requireRolePage("admin");
  const [rawUsers, rawInvitations, politicians] = await Promise.all([
    loadAllUsers(),
    loadUserInvitations(),
    loadPoliticians(),
  ]);
  // クライアントに渡すのに必要最小限のフィールドのみに絞る（authId等を漏らさない）
  const users = rawUsers.map((u) => ({
    id: u.id,
    email: u.email,
    roles: u.roles,
    assignedPoliticianIds: u.assignedPoliticianIds,
    createdAt: u.createdAt,
  }));
  const invitations = rawInvitations.map((i) => ({
    id: i.id,
    email: i.email,
    roles: i.roles,
    politicianIds: i.politicianIds,
    createdAt: i.createdAt,
  }));
  const politicianOptions = politicians.map((p) => ({ id: p.id, name: p.name }));

  return (
    <div>
      <PageHeader label="Users" title="ユーザー管理" />
      <div className="mb-4">
        <UserInvitations
          invitations={invitations}
          availableRoles={USER_ROLES}
          politicians={politicianOptions}
          registerInvitationAction={registerUserInvitation}
          cancelInvitationAction={cancelUserInvitation}
        />
      </div>
      <UserManagement
        users={users}
        availableRoles={USER_ROLES}
        politicians={politicianOptions}
        updateUserRolesAction={updateUserRoles}
        updateUserAssignmentsAction={updateUserAssignments}
        inviteUserAction={inviteUser}
      />
    </div>
  );
}
