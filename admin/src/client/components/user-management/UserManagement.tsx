"use client";
import "client-only";
import { useState } from "react";
import type { ChangeEvent, FormEvent } from "react";
import { useRouter } from "next/navigation";
import {
  Button,
  Checkbox,
  Input,
  Label,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/client/components/ui";
import { AssignmentDialog } from "@/client/components/user-management/AssignmentDialog";
import { UserRoleBadge } from "@/client/components/user-management/UserRoleBadge";
import {
  assignedPoliticianNames,
  formatDate,
  resolveUserRoleBadge,
  toggleUserRole,
} from "@/client/lib";
import type { UserRole } from "@/server/contexts/auth/domain/models/user-role";
import type { User } from "@/server/contexts/shared/domain/repositories/user-repository.interface";

/**
 * ユーザー管理画面で表示するユーザーデータ
 * セキュリティ上、authIdなどの内部情報は含まない
 */
interface UserDisplayData {
  id: string;
  email: string;
  roles: UserRole[];
  /** 担当する議員の ID（調査研究費の書き込みは担当の議員室だけ。#1773） */
  assignedPoliticianIds: string[];
  createdAt: Date;
}

interface UserManagementProps {
  users: UserDisplayData[];
  availableRoles: readonly UserRole[];
  /** 担当として選べる議員 */
  politicians: readonly { id: string; name: string }[];
  updateUserRolesAction: (
    userId: string,
    roles: UserRole[],
  ) => Promise<{ ok: true; user: User } | { ok: false; error: string }>;
  updateUserAssignmentsAction: (
    userId: string,
    politicianIds: string[],
  ) => Promise<{ ok: true; assignedPoliticianIds: string[] } | { ok: false; error: string }>;
  inviteUserAction: (email: string, roles: UserRole[]) => Promise<{ ok: boolean; error?: string }>;
}

/** ロールを複数選ぶチェックボックス群。招待フォームと一覧の各行で共有する */
function RoleCheckboxes({
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

/** 担当する議員の名前を一覧に並べる。担当がいなければ「なし」 */
function AssignedPoliticianNames({
  assignedPoliticianIds,
  politicians,
}: {
  assignedPoliticianIds: readonly string[];
  politicians: readonly { id: string; name: string }[];
}) {
  const names = assignedPoliticianNames(assignedPoliticianIds, politicians);
  if (names.length === 0) return <span className="text-xs text-muted-foreground">なし</span>;
  return <span className="text-[13px] text-foreground">{names.join("、")}</span>;
}

export default function UserManagement({
  users: initialUsers,
  availableRoles,
  politicians,
  updateUserRolesAction,
  updateUserAssignmentsAction,
  inviteUserAction,
}: UserManagementProps) {
  const router = useRouter();
  const [users, setUsers] = useState(initialUsers);
  const [isLoading, setIsLoading] = useState(false);
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRoles, setInviteRoles] = useState<UserRole[]>([]);
  const [isInviting, setIsInviting] = useState(false);
  const [editingAssignmentUser, setEditingAssignmentUser] = useState<UserDisplayData | null>(null);

  const handleRolesChange = async (userId: string, newRoles: UserRole[]) => {
    setIsLoading(true);

    try {
      const result = await updateUserRolesAction(userId, newRoles);
      if (result.ok) {
        // result.userからUserDisplayDataに必要なフィールドのみを取得して更新
        setUsers((prev) =>
          prev.map((user) =>
            user.id === userId
              ? {
                  ...user,
                  id: result.user.id,
                  email: result.user.email,
                  roles: result.user.roles,
                  createdAt: result.user.createdAt,
                }
              : user,
          ),
        );
      } else {
        alert(`ロールの更新に失敗しました: ${result.error}`);
      }
    } catch (error) {
      console.error("Error updating roles:", error);
      alert(
        `ロールの更新に失敗しました: ${error instanceof Error ? error.message : "不明なエラー"}`,
      );
    } finally {
      setIsLoading(false);
    }
  };

  const handleAssignmentSave = async (
    userId: string,
    politicianIds: string[],
  ): Promise<{ ok: true } | { ok: false; error: string }> => {
    const result = await updateUserAssignmentsAction(userId, politicianIds);
    if (!result.ok) return result;
    setUsers((prev) =>
      prev.map((u) =>
        u.id === userId ? { ...u, assignedPoliticianIds: result.assignedPoliticianIds } : u,
      ),
    );
    return { ok: true };
  };

  const handleInviteUser = async (e: FormEvent) => {
    e.preventDefault();
    if (!inviteEmail.trim()) return;

    setIsInviting(true);

    try {
      const result = await inviteUserAction(inviteEmail.trim(), inviteRoles);
      if (result.ok) {
        alert(`${inviteEmail}に招待を送信しました`);
        setInviteEmail("");
        setInviteRoles([]);
        // Server ActionのrevalidatePath()によりキャッシュが無効化されるため、ルーターのrefreshで十分
        router.refresh();
      } else {
        alert(`招待の送信に失敗しました: ${result.error}`);
      }
    } catch (error) {
      console.error("Error sending invitation:", error);
      alert(`招待の送信に失敗しました: ${error instanceof Error ? error.message : "不明なエラー"}`);
    } finally {
      setIsInviting(false);
    }
  };

  return (
    <div className="space-y-4">
      {/* Invite User Form */}
      <div className="rounded-lg border border-border bg-card p-6">
        <h2 className="mb-4 text-base font-bold text-foreground">新規ユーザー招待</h2>
        <form onSubmit={handleInviteUser} className="space-y-3">
          <div className="flex flex-wrap gap-3">
            <Input
              type="email"
              value={inviteEmail}
              onChange={(e: ChangeEvent<HTMLInputElement>) => setInviteEmail(e.target.value)}
              placeholder="メールアドレスを入力"
              disabled={isInviting}
              className="max-w-md flex-1"
              required
            />
            <Button type="submit" disabled={isInviting || !inviteEmail.trim()}>
              {isInviting ? "送信中..." : "招待を送信"}
            </Button>
          </div>
          <RoleCheckboxes
            idPrefix="invite-role"
            ariaLabelPrefix="招待するユーザーのロール: "
            availableRoles={availableRoles}
            roles={inviteRoles}
            disabled={isInviting}
            onToggle={(role, checked) =>
              setInviteRoles((prev) => toggleUserRole(prev, role, checked))
            }
          />
          <p className="text-xs text-muted-foreground">
            ロールを選ばずに招待すると、管理者がロールを付けるまでどの機能も使えません。
          </p>
        </form>
      </div>

      <div className="rounded-lg border border-border bg-card p-6">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>メール</TableHead>
              <TableHead>ロール</TableHead>
              <TableHead>作成日</TableHead>
              <TableHead>ロールの変更</TableHead>
              <TableHead>担当議員（調査研究費）</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {users.map((user) => (
              <TableRow key={user.id}>
                <TableCell className="font-latin text-[13px] text-foreground">
                  {user.email}
                </TableCell>
                <TableCell>
                  {user.roles.length === 0 ? (
                    <span className="text-xs text-muted-foreground">なし</span>
                  ) : (
                    <div className="flex flex-wrap gap-1">
                      {user.roles.map((role) => (
                        <UserRoleBadge key={role} role={role} />
                      ))}
                    </div>
                  )}
                </TableCell>
                <TableCell className="font-latin text-[13px] text-muted-foreground">
                  {formatDate(user.createdAt)}
                </TableCell>
                <TableCell>
                  <RoleCheckboxes
                    idPrefix={`user-${user.id}-role`}
                    ariaLabelPrefix={`${user.email} のロール: `}
                    availableRoles={availableRoles}
                    roles={user.roles}
                    disabled={isLoading}
                    onToggle={(role, checked) =>
                      handleRolesChange(user.id, toggleUserRole(user.roles, role, checked))
                    }
                  />
                </TableCell>
                <TableCell>
                  <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
                    <AssignedPoliticianNames
                      assignedPoliticianIds={user.assignedPoliticianIds}
                      politicians={politicians}
                    />
                    <Button
                      type="button"
                      variant="outline"
                      size="xs"
                      aria-label={`${user.email} の担当議員を変更`}
                      onClick={() => setEditingAssignmentUser(user)}
                      disabled={isLoading}
                    >
                      変更
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>

        {users.length === 0 && (
          <div className="py-8 text-center text-sm text-muted-foreground">
            ユーザーが見つかりません
          </div>
        )}
      </div>

      {editingAssignmentUser && (
        <AssignmentDialog
          user={editingAssignmentUser}
          politicians={politicians}
          onSave={(politicianIds) => handleAssignmentSave(editingAssignmentUser.id, politicianIds)}
          onClose={() => setEditingAssignmentUser(null)}
        />
      )}
    </div>
  );
}
