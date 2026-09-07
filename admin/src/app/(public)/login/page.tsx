import "server-only";
import { loginWithPassword } from "@/server/contexts/auth/presentation/actions/login";
import { loginWithGoogle } from "@/server/contexts/auth/presentation/actions/login-with-google";
import { AuthProviderConfig } from "@/server/contexts/auth/domain/models/auth-provider-config";
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

  const providerConfig = AuthProviderConfig.parse(process.env.ADMIN_AUTH_PROVIDERS);
  const showPasswordLogin = AuthProviderConfig.isEnabled(providerConfig, "password");
  const showGoogleLogin = AuthProviderConfig.isEnabled(providerConfig, "google");

  return (
    <div className="h-full flex items-center justify-center">
      {error && <ToastNotifier type="error" message={error} />}
      <LoginForm
        action={loginWithPassword}
        googleAction={loginWithGoogle}
        showPasswordLogin={showPasswordLogin}
        showGoogleLogin={showGoogleLogin}
        error={error}
        forgotPasswordHref="/forgot-password"
      />
      <InviteTokenHandler />
      <RecoveryTokenHandler />
      <RecoveryCodeHandler />
    </div>
  );
}
