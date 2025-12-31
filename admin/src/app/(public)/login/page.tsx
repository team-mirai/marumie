import "server-only";
import { loginWithPassword } from "@/server/contexts/auth/presentation/actions/login";
import LoginForm from "@/client/components/auth/LoginForm";
import InviteTokenHandler from "./InviteTokenHandler";
import RecoveryTokenHandler from "@/client/components/auth/RecoveryTokenHandler";
import RecoveryCodeHandler from "@/client/components/auth/RecoveryCodeHandler";
import ToastNotifier from "@/client/components/auth/ToastNotifier";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const params = await searchParams;
  const error = params?.error ?? "";

  return (
    <div className="h-full flex items-center justify-center">
      {error && <ToastNotifier type="error" message={error} />}
      <LoginForm action={loginWithPassword} error={error} forgotPasswordHref="/forgot-password" />
      <InviteTokenHandler />
      <RecoveryTokenHandler />
      <RecoveryCodeHandler />
    </div>
  );
}
