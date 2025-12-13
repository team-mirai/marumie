import { createClient } from "@/server/contexts/auth/application/client";

export const runtime = "nodejs";

export default async function UserInfoPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return <div className="card">ユーザー情報が見つかりません</div>;
  }

  const userRole = user.user_metadata?.role || "user";

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
        <b>ロール:</b> {userRole}
      </p>
      <p>
        <b>最終ログイン:</b>{" "}
        {user.last_sign_in_at
          ? new Date(user.last_sign_in_at).toLocaleString("ja-JP")
          : "N/A"}
      </p>
    </div>
  );
}
