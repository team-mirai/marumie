import "server-only";
import { getCurrentUser } from "@/server/contexts/auth/presentation/loaders/load-current-user";
import { resetPassword } from "@/server/contexts/auth/presentation/actions/reset-password";
import { redirect } from "next/navigation";
import SetupForm from "@/client/components/auth/SetupForm";
import { PublicAuthCard } from "@/client/components/auth/PublicAuthCard";

export const dynamic = "force-dynamic";

export default async function ResetPasswordPage() {
  const user = await getCurrentUser();

  if (!user) {
    redirect("/login");
  }

  return (
    <PublicAuthCard title="パスワードを変更" description="新しいパスワードを設定してください。">
      <SetupForm userEmail={user.email} setupPasswordAction={resetPassword} />
    </PublicAuthCard>
  );
}
