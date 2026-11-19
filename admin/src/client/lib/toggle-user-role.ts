import { USER_ROLES, type UserRole } from "@/server/contexts/auth/domain/models/user-role";

/**
 * ロールの集合に 1 つのロールを付け外しした結果を返す（表示順に並べ、重複させない）。
 */
export function toggleUserRole(
  roles: readonly UserRole[],
  role: UserRole,
  checked: boolean,
): UserRole[] {
  const next = new Set(roles);
  if (checked) next.add(role);
  else next.delete(role);
  return USER_ROLES.filter((r) => next.has(r));
}
