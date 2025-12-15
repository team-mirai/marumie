"use client";
import "client-only";
import { useState } from "react";
import { Button, Input, Card } from "../ui";
import { apiClient } from "@/client/lib/api-client";
import type { UserRole } from "@prisma/client";

interface User {
  id: string;
  email: string;
  role: UserRole;
  createdAt: Date;
}

interface UserManagementProps {
  users: User[];
  availableRoles: UserRole[];
}

export default function UserManagement({
  users: initialUsers,
  availableRoles,
}: UserManagementProps) {
  const [users, setUsers] = useState(initialUsers);
  const [isLoading, setIsLoading] = useState(false);
  const [inviteEmail, setInviteEmail] = useState("");
  const [isInviting, setIsInviting] = useState(false);

  const handleRoleChange = async (userId: string, newRole: UserRole) => {
    setIsLoading(true);

    try {
      await apiClient.updateUserRole({ userId, role: newRole });
      setUsers((prev) =>
        prev.map((user) => (user.id === userId ? { ...user, role: newRole } : user)),
      );
    } catch (error) {
      console.error("Error updating role:", error);
      alert(
        `ロールの更新に失敗しました: ${error instanceof Error ? error.message : "不明なエラー"}`,
      );
    } finally {
      setIsLoading(false);
    }
  };

  const handleInviteUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inviteEmail.trim()) return;

    setIsInviting(true);

    try {
      await apiClient.inviteUser({ email: inviteEmail.trim() });
      alert(`${inviteEmail}に招待を送信しました`);
      setInviteEmail("");
      // Refresh the user list to show pending invitations
      window.location.reload();
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
      <Card>
        <h2 className="text-lg font-medium text-white mb-4">新規ユーザー招待</h2>
        <form onSubmit={handleInviteUser} className="flex gap-4">
          <div className="flex-1">
            <Input
              type="email"
              value={inviteEmail}
              onChange={(e) => setInviteEmail(e.target.value)}
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
        <table className="min-w-full divide-y divide-primary-border">
          <thead className="bg-primary-hover">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-primary-muted uppercase tracking-wider">
                メール
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-primary-muted uppercase tracking-wider">
                ロール
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-primary-muted uppercase tracking-wider">
                作成日
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-primary-muted uppercase tracking-wider">
                操作
              </th>
            </tr>
          </thead>
          <tbody className="bg-primary-panel divide-y divide-primary-border">
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
                <td className="px-6 py-4 whitespace-nowrap text-sm text-primary-muted">
                  {new Date(user.createdAt).toLocaleDateString()}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                  <select
                    value={user.role}
                    onChange={(e) => handleRoleChange(user.id, e.target.value as UserRole)}
                    disabled={isLoading}
                    className="bg-primary-input text-white border border-primary-border rounded-md px-3 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-primary-accent"
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
          <div className="text-center py-8 text-primary-muted">ユーザーが見つかりません</div>
        )}
      </Card>
    </div>
  );
}
