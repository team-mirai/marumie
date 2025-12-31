import "server-only";
import Link from "next/link";
import { requestPasswordReset } from "@/server/contexts/auth/presentation/actions/request-password-reset";
import ForgotPasswordForm from "@/client/components/auth/ForgotPasswordForm";
import ToastNotifier from "@/client/components/auth/ToastNotifier";
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
  CardDescription,
  Button,
} from "@/client/components/ui";

interface ForgotPasswordPageProps {
  searchParams: Promise<{ sent?: string }>;
}

export default async function ForgotPasswordPage({ searchParams }: ForgotPasswordPageProps) {
  const params = await searchParams;
  const sent = params?.sent === "true";

  if (sent) {
    return (
      <div className="h-full flex items-center justify-center">
        <ToastNotifier type="success" message="パスワードリセット用のメールを送信しました" />
        <Card className="w-full max-w-md">
          <CardHeader className="px-8 pt-8 pb-4">
            <CardTitle className="text-2xl">メールを送信しました</CardTitle>
            <CardDescription>
              パスワードリセット用のリンクをメールで送信しました。
              メールが届かない場合は、迷惑メールフォルダをご確認ください。
            </CardDescription>
          </CardHeader>
          <CardContent className="px-8 pb-8">
            <Link href="/login">
              <Button className="w-full">ログイン画面に戻る</Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="h-full flex items-center justify-center">
      <ForgotPasswordForm action={requestPasswordReset} />
    </div>
  );
}
