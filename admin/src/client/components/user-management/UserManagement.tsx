"use client";
import "client-only";
import { useState } from "react";
import type { ChangeEvent, FormEvent } from "react";
import { useRouter } from "next/navigation";
import { Button, Input, Card } from "../ui";
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
      <Card className="p-4">
        <h2 className="text-lg font-medium text-white mb-4">新規ユーザー招待</h2>
        <form onSubmit={handleInviteUser} className="flex gap-4">
          <div className="flex-1">
            <Input
              type="email"
              value={inviteEmail}
              onChange={(e: ChangeEvent<HTMLInputElement>) => setInviteEmail(e.target.value)}
              placeholder="メールアドレスを入力"
              disabled={isInviting}
              required
            />
          </div>
          <Button type="submit" disabled={isInviting || !inviteEmail.trim()}>
            {isInviting ? "送信中..." : "招待を送信"}
          </Button>
        </form>
      </Card>

      <Card className="overflow-hidden p-0">
        <table className="min-w-full divide-y divide-border">
          <thead className="bg-secondary">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                メール
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                ロール
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                作成日
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                操作
              </th>
            </tr>
          </thead>
          <tbody className="bg-card divide-y divide-border">
            {users.map((user) => (
              <tr key={user.id}>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-white">{user.email}</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-white">
                  <span
                    className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                      user.role === "admin"
                        ? "bg-red-900 text-red-200"
                        : "bg-green-900 text-green-200"
                    }`}
                  >
                    {user.role}
                  </span>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-muted-foreground">
                  {new Date(user.createdAt).toLocaleDateString()}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                  <select
                    value={user.role}
                    onChange={(e) => handleRoleChange(user.id, e.target.value as UserRole)}
                    disabled={isLoading}
                    className="bg-input text-white border border-border rounded-md px-3 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                  >
                    {availableRoles.map((role) => (
                      <option key={role} value={role}>
                        {role.charAt(0).toUpperCase() + role.slice(1)}
                      </option>
                    ))}
                  </select>
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {users.length === 0 && (
          <div className="text-center py-8 text-muted-foreground">ユーザーが見つかりません</div>
        )}
      </Card>
    </div>
  );
}
