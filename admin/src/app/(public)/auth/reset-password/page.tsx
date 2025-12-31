import "server-only";
import { getCurrentUser } from "@/server/contexts/auth/presentation/loaders/load-current-user";
import { resetPassword } from "@/server/contexts/auth/presentation/actions/reset-password";
import { redirect } from "next/navigation";
import SetupForm from "@/client/components/auth/SetupForm";

export const dynamic = "force-dynamic";

export default async function ResetPasswordPage() {
  const user = await getCurrentUser();

  if (!user) {
    redirect("/login");
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        <div>
          <h2 className="mt-6 text-center text-3xl font-extrabold text-foreground">
            パスワードを変更
          </h2>
          <p className="mt-2 text-center text-sm text-muted-foreground">
            新しいパスワードを設定してください。
          </p>
        </div>
        <SetupForm userEmail={user.email} setupPasswordAction={resetPassword} />
      </div>
    </div>
  );
}
