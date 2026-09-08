"use client";
import "client-only";
import { useState } from "react";
import type { ChangeEvent, FormEvent } from "react";
import { useRouter } from "next/navigation";
import {
  Button,
  Input,
  NativeSelect,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/client/components/ui";
import { UserRoleBadge } from "@/client/components/user-management/UserRoleBadge";
import { formatDate } from "@/client/lib";
import type { UserRole } from "@/server/contexts/auth/domain/models/user-role";
import type { User } from "@/server/contexts/shared/domain/repositories/user-repository.interface";

/**
 * ユーザー管理画面で表示するユーザーデータ
 * セキュリティ上、authIdなどの内部情報は含まない
 */
interface UserDisplayData {
  id: string;
  email: string;
  role: UserRole;
  createdAt: Date;
}

interface UserManagementProps {
  users: UserDisplayData[];
  availableRoles: UserRole[];
  updateUserRoleAction: (
    userId: string,
    role: UserRole,
  ) => Promise<{ ok: true; user: User } | { ok: false; error: string }>;
  inviteUserAction: (email: string) => Promise<{ ok: boolean; error?: string }>;
}

export default function UserManagement({
  users: initialUsers,
  availableRoles,
  updateUserRoleAction,
  inviteUserAction,
}: UserManagementProps) {
  const router = useRouter();
  const [users, setUsers] = useState(initialUsers);
  const [isLoading, setIsLoading] = useState(false);
  const [inviteEmail, setInviteEmail] = useState("");
  const [isInviting, setIsInviting] = useState(false);

  const handleRoleChange = async (userId: string, newRole: UserRole) => {
    setIsLoading(true);

    try {
      const result = await updateUserRoleAction(userId, newRole);
      if (result.ok) {
        // result.userからUserDisplayDataに必要なフィールドのみを取得して更新
        setUsers((prev) =>
          prev.map((user) =>
            user.id === userId
              ? {
                  id: result.user.id,
                  email: result.user.email,
                  role: result.user.role,
                  createdAt: result.user.createdAt,
                }
              : user,
          ),
        );
      } else {
        alert(`ロールの更新に失敗しました: ${result.error}`);
      }
    } catch (error) {
      console.error("Error updating role:", error);
      alert(
        `ロールの更新に失敗しました: ${error instanceof Error ? error.message : "不明なエラー"}`,
      );
    } finally {
      setIsLoading(false);
    }
  };

  const handleInviteUser = async (e: FormEvent) => {
    e.preventDefault();
    if (!inviteEmail.trim()) return;

    setIsInviting(true);

    try {
      const result = await inviteUserAction(inviteEmail.trim());
      if (result.ok) {
        alert(`${inviteEmail}に招待を送信しました`);
        setInviteEmail("");
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
        <form onSubmit={handleInviteUser} className="flex flex-wrap gap-3">
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
        </form>
      </div>

      <div className="rounded-lg border border-border bg-card p-6">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>メール</TableHead>
              <TableHead>ロール</TableHead>
              <TableHead>作成日</TableHead>
              <TableHead>操作</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {users.map((user) => (
              <TableRow key={user.id}>
                <TableCell className="font-latin text-[13px] text-foreground">
                  {user.email}
                </TableCell>
                <TableCell>
                  <UserRoleBadge role={user.role} />
                </TableCell>
                <TableCell className="font-latin text-[13px] text-muted-foreground">
                  {formatDate(user.createdAt)}
                </TableCell>
                <TableCell>
                  <NativeSelect
                    aria-label={`${user.email} のロール`}
                    value={user.role}
                    onChange={(e) => handleRoleChange(user.id, e.target.value as UserRole)}
                    disabled={isLoading}
                    className="h-8 text-xs"
                  >
                    {availableRoles.map((role) => (
                      <option key={role} value={role}>
                        {role.charAt(0).toUpperCase() + role.slice(1)}
                      </option>
                    ))}
                  </NativeSelect>
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
    </div>
  );
}
