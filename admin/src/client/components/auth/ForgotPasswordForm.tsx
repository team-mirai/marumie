"use client";
import "client-only";
import { useState } from "react";
import Link from "next/link";
import {
  Button,
  Input,
  Card,
  CardHeader,
  CardTitle,
  CardContent,
  CardDescription,
  Label,
} from "@/client/components/ui";

interface ForgotPasswordFormProps {
  action: (formData: FormData) => Promise<void>;
}

export default function ForgotPasswordForm({ action }: ForgotPasswordFormProps) {
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsLoading(true);

    const formData = new FormData(e.currentTarget);
    try {
      await action(formData);
    } catch (error) {
      console.error("Password reset request failed:", error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Card className="w-full max-w-md">
      <CardHeader className="px-8 pt-8 pb-4">
        <CardTitle className="text-2xl">パスワードをリセット</CardTitle>
        <CardDescription>
          登録されているメールアドレスにリセット用のリンクを送信します。
        </CardDescription>
      </CardHeader>
      <CardContent className="px-8 pb-8">
        <form onSubmit={handleSubmit} className="grid gap-4">
          <div className="space-y-3">
            <Label htmlFor="email">Email</Label>
            <Input id="email" name="email" type="email" required />
          </div>
          <Button type="submit" disabled={isLoading} className="mt-4 w-full">
            {isLoading ? "送信中..." : "リセットメールを送信"}
          </Button>
          <div className="text-center mt-2">
            <Link href="/login" className="text-sm text-muted-foreground hover:underline">
              ログイン画面に戻る
            </Link>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
