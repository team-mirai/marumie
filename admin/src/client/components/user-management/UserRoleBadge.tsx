import type { UserRole } from "@/server/contexts/auth/domain/models/user-role";
import { cn, resolveUserRoleBadge } from "@/client/lib";

interface UserRoleBadgeProps {
  role: UserRole;
}

/** ユーザーロールのピルバッジ（11px/700・1.5px 枠）。admin=teal / user=グレー。 */
export function UserRoleBadge({ role }: UserRoleBadgeProps) {
  const badge = resolveUserRoleBadge(role);
  return (
    <span
      className={cn(
        "font-latin inline-block rounded-full border-[1.5px] px-3 py-[3px] text-[11px] font-bold leading-none tracking-[0.04em] whitespace-nowrap",
        badge.className,
      )}
    >
      {badge.label}
    </span>
  );
}
