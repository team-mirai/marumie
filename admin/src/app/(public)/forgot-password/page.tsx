import "server-only";
import Link from "next/link";
import { requestPasswordReset } from "@/server/contexts/auth/presentation/actions/request-password-reset";
import ForgotPasswordForm from "@/client/components/auth/ForgotPasswordForm";
import { PublicAuthCard } from "@/client/components/auth/PublicAuthCard";
import ToastNotifier from "@/client/components/auth/ToastNotifier";
import { Button } from "@/client/components/ui";

interface ForgotPasswordPageProps {
  searchParams: Promise<{ sent?: string }>;
}

export default async function ForgotPasswordPage({ searchParams }: ForgotPasswordPageProps) {
  const params = await searchParams;
  const sent = params?.sent === "true";

  if (sent) {
    return (
      <>
        <ToastNotifier type="success" message="パスワードリセット用のメールを送信しました" />
        <PublicAuthCard
          title="メールを送信しました"
          description="パスワードリセット用のリンクをメールで送信しました。メールが届かない場合は、迷惑メールフォルダをご確認ください。"
        >
          <Button asChild className="w-full">
            <Link href="/login">ログイン画面に戻る</Link>
          </Button>
        </PublicAuthCard>
      </>
    );
  }

  return <ForgotPasswordForm action={requestPasswordReset} />;
}
