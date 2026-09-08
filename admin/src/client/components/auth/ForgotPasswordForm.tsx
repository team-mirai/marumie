"use client";
import "client-only";
import { useActionState } from "react";
import Link from "next/link";
import { Button, Input, Label } from "@/client/components/ui";
import { PublicAuthCard } from "@/client/components/auth/PublicAuthCard";

interface ForgotPasswordFormProps {
  action: (formData: FormData) => Promise<void>;
}

export default function ForgotPasswordForm({ action }: ForgotPasswordFormProps) {
  const [, formAction, isPending] = useActionState(async (_: unknown, formData: FormData) => {
    await action(formData);
    return null;
  }, null);

  return (
    <PublicAuthCard
      title="パスワードをリセット"
      description="登録されているメールアドレスにリセット用のリンクを送信します。"
    >
      <form action={formAction} className="grid gap-4">
        <div className="space-y-2">
          <Label htmlFor="email">Email</Label>
          <Input id="email" name="email" type="email" autoComplete="email" required />
        </div>
        <Button type="submit" disabled={isPending} className="mt-2 w-full">
          {isPending ? "送信中..." : "リセットメールを送信"}
        </Button>
        <div className="mt-2 text-center">
          <Link
            href="/login"
            className="text-[13px] text-primary-active transition-colors duration-150 ease-out hover:text-primary-hover hover:underline"
          >
            ログイン画面に戻る
          </Link>
        </div>
      </form>
    </PublicAuthCard>
  );
}
