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
  Label,
} from "@/client/components/ui";

interface LoginFormProps {
  action: (formData: FormData) => Promise<void>;
  googleAction?: () => Promise<void>;
  showPasswordLogin?: boolean;
  showGoogleLogin?: boolean;
  error?: string;
  forgotPasswordHref?: string;
}

export default function LoginForm({
  action,
  googleAction,
  showPasswordLogin = true,
  showGoogleLogin = false,
  error,
  forgotPasswordHref,
}: LoginFormProps) {
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsLoading(true);

    const formData = new FormData(e.currentTarget);
    try {
      await action(formData);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Card className="w-full max-w-md">
      <CardHeader className="px-8 pt-8 pb-4">
        <CardTitle className="text-2xl">ログイン</CardTitle>
      </CardHeader>
      <CardContent className="px-8 pb-8">
        {showPasswordLogin && (
          <form onSubmit={handleSubmit} className="grid gap-4">
            <div className="space-y-3">
              <Label htmlFor="email">Email</Label>
              <Input id="email" name="email" type="email" required />
            </div>
            <div className="space-y-3">
              <Label htmlFor="password">Password</Label>
              <Input id="password" name="password" type="password" required />
            </div>
            {forgotPasswordHref && (
              <div className="text-right">
                <Link
                  href={forgotPasswordHref}
                  className="text-sm text-muted-foreground hover:underline"
                >
                  パスワードを忘れた場合
                </Link>
              </div>
            )}
            <Button type="submit" disabled={isLoading} className="mt-4 w-full">
              {isLoading ? "ログイン中..." : "ログイン"}
            </Button>
          </form>
        )}
        {showPasswordLogin && showGoogleLogin && (
          <div className="relative my-6">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-border" />
            </div>
            <div className="relative flex justify-center">
              <span className="bg-card px-3 text-sm text-muted-foreground">または</span>
            </div>
          </div>
        )}
        {showGoogleLogin && googleAction && (
          <form action={googleAction}>
            <Button type="submit" variant="outline" className="w-full">
              Google でログイン
            </Button>
          </form>
        )}
        {error && <div className="text-muted-foreground mt-4">{error}</div>}
      </CardContent>
    </Card>
  );
}
