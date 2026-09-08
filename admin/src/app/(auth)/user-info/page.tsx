import { getCurrentUser } from "@/server/contexts/auth/presentation/loaders/load-current-user";
import { PageHeader } from "@/client/components/layout/PageHeader";

export const runtime = "nodejs";

export default async function UserInfoPage() {
  const user = await getCurrentUser();

  if (!user) {
    return (
      <div>
        <PageHeader label="User Info" title="ユーザー情報" />
        <div className="bg-card rounded-xl p-4">ユーザー情報が見つかりません</div>
      </div>
    );
  }

  const createdAt = user.createdAt instanceof Date ? user.createdAt : new Date(user.createdAt ?? 0);

  return (
    <div>
      <PageHeader label="User Info" title="ユーザー情報" />
      <div className="bg-card rounded-xl p-4">
        <p>
          <b>ID:</b> {user.id}
        </p>
        <p>
          <b>メールアドレス:</b> {user.email}
        </p>
        <p>
          <b>ロール:</b> {user.role}
        </p>
        <p>
          <b>作成日:</b> {createdAt.toLocaleString("ja-JP")}
        </p>
      </div>
    </div>
  );
}
