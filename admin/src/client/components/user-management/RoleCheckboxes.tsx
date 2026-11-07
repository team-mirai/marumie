"use client";
import "client-only";
import { Checkbox, Label } from "@/client/components/ui";
import { resolveUserRoleBadge } from "@/client/lib";
import type { UserRole } from "@/server/contexts/auth/domain/models/user-role";

/** ロールを複数選ぶチェックボックス群。招待フォーム・招待（予約）フォーム・一覧の各行で共有する */
export function RoleCheckboxes({
  idPrefix,
  ariaLabelPrefix,
  availableRoles,
  roles,
  disabled,
  onToggle,
}: {
  idPrefix: string;
  ariaLabelPrefix: string;
  availableRoles: readonly UserRole[];
  roles: readonly UserRole[];
  disabled: boolean;
  onToggle: (role: UserRole, checked: boolean) => void;
}) {
  return (
    <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
      {availableRoles.map((role) => {
        const id = `${idPrefix}-${role}`;
        const label = resolveUserRoleBadge(role).label;
        return (
          <div key={role} className="flex items-center gap-1.5">
            <Checkbox
              id={id}
              aria-label={`${ariaLabelPrefix}${label}`}
              checked={roles.includes(role)}
              onCheckedChange={(checked) => onToggle(role, checked === true)}
              disabled={disabled}
            />
            <Label htmlFor={id} className="font-normal">
              {label}
            </Label>
          </div>
        );
      })}
    </div>
  );
}
