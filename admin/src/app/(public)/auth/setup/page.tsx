import "server-only";
import { getCurrentUser } from "@/server/contexts/auth/presentation/loaders/load-current-user";
import { setupPassword } from "@/server/contexts/auth/presentation/actions/setup-password";
import { redirect } from "next/navigation";
import SetupForm from "@/client/components/auth/SetupForm";

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
      <div className="min-h-screen flex items-center justify-center bg-background py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-md w-full space-y-8">
          <div>
            <h2 className="mt-6 text-center text-3xl font-extrabold text-foreground">
              アカウント設定
            </h2>
            <p className="mt-2 text-center text-sm text-muted-foreground">
              「みらいまる見え政治資金」に招待されました。パスワードを設定して利用を開始してください。
            </p>
          </div>
          <SetupForm userEmail={user.email} setupPasswordAction={setupPassword} />
        </div>
      </div>
    );
  }

  // User is already set up, redirect to main app
  redirect("/");
}
