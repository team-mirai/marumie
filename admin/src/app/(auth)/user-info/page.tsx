import { getCurrentUser } from "@/server/contexts/auth";

export const runtime = "nodejs";

export default async function UserInfoPage() {
  const user = await getCurrentUser();

  if (!user) {
    return <div className="card">ユーザー情報が見つかりません</div>;
  }

  const createdAt = user.createdAt instanceof Date ? user.createdAt : new Date(user.createdAt ?? 0);

  return (
    <div className="card">
      <h1>ユーザー情報</h1>
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
  );
}
