import { getCurrentUser } from "@/server/contexts/auth/presentation/loaders/load-current-user";
import { PageHeader } from "@/client/components/layout/PageHeader";
import { UserRoleBadge } from "@/client/components/user-management/UserRoleBadge";
import { formatDate } from "@/client/lib";

export const runtime = "nodejs";

export default async function UserInfoPage() {
  const user = await getCurrentUser();

  if (!user) {
    return (
      <div>
        <PageHeader label="User Info" title="ユーザー情報" />
        <div className="rounded-lg border border-border bg-card p-6 text-sm text-muted-foreground">
          ユーザー情報が見つかりません
        </div>
      </div>
    );
  }

  const createdAt = user.createdAt instanceof Date ? user.createdAt : new Date(user.createdAt ?? 0);

  return (
    <div>
      <PageHeader label="User Info" title="ユーザー情報" />
      <div className="rounded-lg border border-border bg-card px-6 py-2">
        <dl className="text-sm">
          <div className="flex items-center gap-6 border-b border-border-soft py-3">
            <dt className="w-32 shrink-0 text-xs font-bold text-foreground">ID:</dt>
            <dd className="font-latin text-xs text-muted-foreground">{user.id}</dd>
          </div>
          <div className="flex items-center gap-6 border-b border-border-soft py-3">
            <dt className="w-32 shrink-0 text-xs font-bold text-foreground">メールアドレス:</dt>
            <dd className="font-latin text-foreground">{user.email}</dd>
          </div>
          <div className="flex items-center gap-6 border-b border-border-soft py-3">
            <dt className="w-32 shrink-0 text-xs font-bold text-foreground">ロール:</dt>
            <dd>
              <UserRoleBadge role={user.role} />
            </dd>
          </div>
          <div className="flex items-center gap-6 py-3">
            <dt className="w-32 shrink-0 text-xs font-bold text-foreground">作成日:</dt>
            <dd className="font-latin text-foreground">{formatDate(createdAt)}</dd>
          </div>
        </dl>
      </div>
    </div>
  );
}
