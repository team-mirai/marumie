import "server-only";
import { loginWithPassword } from "@/server/contexts/auth";
import LoginForm from "@/client/components/auth/LoginForm";
import InviteProcessor from "./processor";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const params = await searchParams;
  const error = params?.error ?? "";

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <LoginForm action={loginWithPassword} error={error} />
        <InviteProcessor />
      </div>
    </div>
  );
}
