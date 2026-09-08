"use client";
import "client-only";
import { useState } from "react";
import Link from "next/link";
import { Button, Input, Label } from "@/client/components/ui";
import { PublicAuthCard } from "@/client/components/auth/PublicAuthCard";

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
    <PublicAuthCard title="ログイン">
      {showPasswordLogin && (
        <form onSubmit={handleSubmit} className="grid gap-4">
          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input id="email" name="email" type="email" autoComplete="email" required />
          </div>
          <div className="space-y-2">
            <Label htmlFor="password">Password</Label>
            <Input
              id="password"
              name="password"
              type="password"
              autoComplete="current-password"
              required
            />
          </div>
          {forgotPasswordHref && (
            <div className="text-right">
              <Link
                href={forgotPasswordHref}
                className="text-[13px] text-primary-active transition-colors duration-150 ease-out hover:text-primary-hover hover:underline"
              >
                パスワードを忘れた場合
              </Link>
            </div>
          )}
          <Button type="submit" disabled={isLoading} className="mt-2 w-full">
            {isLoading ? "ログイン中..." : "ログイン"}
          </Button>
        </form>
      )}
      {showPasswordLogin && showGoogleLogin && (
        <div className="relative my-6">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-border-soft" />
          </div>
          <div className="relative flex justify-center">
            <span className="bg-card px-3 text-xs text-subtle-foreground">または</span>
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
      {error && (
        <p role="alert" className="mt-4 text-center text-sm text-destructive">
          {error}
        </p>
      )}
    </PublicAuthCard>
  );
}
