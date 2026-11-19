import "server-only";
import { getCurrentUser } from "@/server/contexts/auth/presentation/loaders/load-current-user";
import { setupPassword } from "@/server/contexts/auth/presentation/actions/setup-password";
import { redirect } from "next/navigation";
import SetupForm from "@/client/components/auth/SetupForm";
import { PublicAuthCard } from "@/client/components/auth/PublicAuthCard";

// 認証チェックでcookiesを使用するため動的レンダリングを強制
export const dynamic = "force-dynamic";

interface SetupPageProps {
  searchParams: Promise<{ from?: string }>;
}

export default async function SetupPage({ searchParams }: SetupPageProps) {
  const user = await getCurrentUser();

  if (!user) {
    redirect("/login");
  }

  // Check if this is coming from an invitation flow
  const params = await searchParams;
  const fromInvite = params.from === "invite";

  if (fromInvite) {
    // This is an invited user who needs to set up their password
    return (
      <PublicAuthCard
        title="アカウント設定"
        description="「みらいまる見え政治資金」に招待されました。パスワードを設定して利用を開始してください。"
      >
        <SetupForm userEmail={user.email} setupPasswordAction={setupPassword} />
      </PublicAuthCard>
    );
  }

  // User is already set up, redirect to main app
  redirect("/");
}
