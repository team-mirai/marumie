"use client";
import "client-only";
import { useState } from "react";
import type { ChangeEvent, FormEvent } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
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
import { RoleCheckboxes } from "@/client/components/user-management/RoleCheckboxes";
import { UserRoleBadge } from "@/client/components/user-management/UserRoleBadge";
import {
  assignedPoliticianNames,
  formatDate,
  togglePoliticianAssignment,
  toggleUserRole,
} from "@/client/lib";
import type { UserRole } from "@/server/contexts/auth/domain/models/user-role";

/** 画面に表示する未使用の招待 */
interface InvitationDisplayData {
  id: string;
  email: string;
  roles: UserRole[];
  politicianIds: string[];
  createdAt: Date;
}

type ActionResult = { ok: true } | { ok: false; error: string };

interface UserInvitationsProps {
  invitations: InvitationDisplayData[];
  availableRoles: readonly UserRole[];
  /** 担当として選べる議員 */
  politicians: readonly { id: string; name: string }[];
  registerInvitationAction: (
    email: string,
    roles: UserRole[],
    politicianIds: string[],
  ) => Promise<ActionResult>;
  cancelInvitationAction: (invitationId: string) => Promise<ActionResult>;
}

/**
 * 初回ログイン前の人に、ロールと担当議員を招待（予約）しておく（#1882）。
 * 招待メールは送らない。招待したメールアドレスの人が許可ドメインの Google アカウントで初めてログインすると、
 * ロールと担当議員が付いた状態で使い始められる。未使用の招待はユーザー一覧とは別にここへ並べる。
 */
export default function UserInvitations({
  invitations,
  availableRoles,
  politicians,
  registerInvitationAction,
  cancelInvitationAction,
}: UserInvitationsProps) {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [roles, setRoles] = useState<UserRole[]>([]);
  const [politicianIds, setPoliticianIds] = useState<string[]>([]);
  const [isRegistering, setIsRegistering] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [cancelingId, setCancelingId] = useState<string | null>(null);

  const handleRegister = async (e: FormEvent) => {
    e.preventDefault();
    if (!email.trim()) return;

    setIsRegistering(true);
    setError(null);
    try {
      const result = await registerInvitationAction(email.trim(), roles, politicianIds);
      if (result.ok) {
        toast.success(`${email.trim()} への招待を登録しました`);
        setEmail("");
        setRoles([]);
        setPoliticianIds([]);
        router.refresh();
      } else {
        setError(result.error);
      }
    } catch (e) {
      console.error("Error registering invitation:", e);
      setError(e instanceof Error ? e.message : "不明なエラー");
    } finally {
      setIsRegistering(false);
    }
  };

  const handleCancel = async (invitation: InvitationDisplayData) => {
    if (!window.confirm(`${invitation.email} への招待を取り消しますか？`)) return;

    setCancelingId(invitation.id);
    try {
      const result = await cancelInvitationAction(invitation.id);
      if (result.ok) {
        toast.success(`${invitation.email} への招待を取り消しました`);
      } else {
        toast.error(`招待の取り消しに失敗しました: ${result.error}`);
      }
      // 既に使われていた場合も一覧を最新にする
      router.refresh();
    } catch (e) {
      console.error("Error canceling invitation:", e);
      toast.error(
        `招待の取り消しに失敗しました: ${e instanceof Error ? e.message : "不明なエラー"}`,
      );
    } finally {
      setCancelingId(null);
    }
  };

  return (
    <div className="rounded-lg border border-border bg-card p-6">
      <h2 className="mb-1 text-base font-bold text-foreground">ログイン前の招待（予約）</h2>
      <p className="mb-4 text-xs text-muted-foreground">
        招待メールは送りません。このメールアドレスの人が許可ドメインの Google
        アカウントで初めてログインすると、ここで選んだロールと担当議員が付きます。
      </p>

      <form onSubmit={handleRegister} className="space-y-3">
        <div className="flex flex-wrap gap-3">
          <Input
            type="email"
            aria-label="招待するメールアドレス"
            value={email}
            onChange={(e: ChangeEvent<HTMLInputElement>) => setEmail(e.target.value)}
            placeholder="メールアドレスを入力"
            disabled={isRegistering}
            className="max-w-md flex-1"
            required
          />
          <Button type="submit" disabled={isRegistering || !email.trim()}>
            {isRegistering ? "登録中..." : "招待を登録"}
          </Button>
        </div>
        <RoleCheckboxes
          idPrefix="reservation-role"
          ariaLabelPrefix="招待（予約）のロール: "
          availableRoles={availableRoles}
          roles={roles}
          disabled={isRegistering}
          onToggle={(role, checked) => setRoles((prev) => toggleUserRole(prev, role, checked))}
        />
        {politicians.length > 0 && (
          <div className="space-y-1.5">
            <p className="text-xs text-muted-foreground">担当議員（調査研究費）</p>
            <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
              {politicians.map((politician) => {
                const id = `reservation-politician-${politician.id}`;
                return (
                  <div key={politician.id} className="flex items-center gap-1.5">
                    <Checkbox
                      id={id}
                      aria-label={`招待（予約）の担当議員: ${politician.name}`}
                      checked={politicianIds.includes(politician.id)}
                      onCheckedChange={(checked) =>
                        setPoliticianIds((prev) =>
                          togglePoliticianAssignment(
                            prev,
                            politician.id,
                            checked === true,
                            politicians,
                          ),
                        )
                      }
                      disabled={isRegistering}
                    />
                    <Label htmlFor={id} className="font-normal">
                      {politician.name}
                    </Label>
                  </div>
                );
              })}
            </div>
          </div>
        )}
        {error && (
          <p role="alert" className="text-sm text-destructive">
            招待を登録できませんでした: {error}
          </p>
        )}
      </form>

      <h3 className="mt-6 mb-2 text-sm font-bold text-foreground">未使用の招待</h3>
      {invitations.length === 0 ? (
        <p className="py-4 text-sm text-muted-foreground">未使用の招待はありません</p>
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>メール</TableHead>
              <TableHead>ロール</TableHead>
              <TableHead>担当議員（調査研究費）</TableHead>
              <TableHead>登録日</TableHead>
              <TableHead />
            </TableRow>
          </TableHeader>
          <TableBody>
            {invitations.map((invitation) => {
              const names = assignedPoliticianNames(invitation.politicianIds, politicians);
              return (
                <TableRow key={invitation.id}>
                  <TableCell className="font-latin text-[13px] text-foreground">
                    {invitation.email}
                  </TableCell>
                  <TableCell>
                    {invitation.roles.length === 0 ? (
                      <span className="text-xs text-muted-foreground">なし</span>
                    ) : (
                      <div className="flex flex-wrap gap-1">
                        {invitation.roles.map((role) => (
                          <UserRoleBadge key={role} role={role} />
                        ))}
                      </div>
                    )}
                  </TableCell>
                  <TableCell>
                    {names.length === 0 ? (
                      <span className="text-xs text-muted-foreground">なし</span>
                    ) : (
                      <span className="text-[13px] text-foreground">{names.join("、")}</span>
                    )}
                  </TableCell>
                  <TableCell className="font-latin text-[13px] text-muted-foreground">
                    {formatDate(invitation.createdAt)}
                  </TableCell>
                  <TableCell className="text-right">
                    <Button
                      type="button"
                      variant="outline"
                      size="xs"
                      aria-label={`${invitation.email} への招待を取り消す`}
                      onClick={() => handleCancel(invitation)}
                      disabled={cancelingId !== null}
                    >
                      {cancelingId === invitation.id ? "取り消し中..." : "取り消す"}
                    </Button>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      )}
    </div>
  );
}
