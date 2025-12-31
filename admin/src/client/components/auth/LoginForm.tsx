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
  error?: string;
  forgotPasswordHref?: string;
}

export default function LoginForm({ action, error, forgotPasswordHref }: LoginFormProps) {
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
          {error && <div className="text-muted-foreground mt-2">{error}</div>}
        </form>
      </CardContent>
    </Card>
  );
}
